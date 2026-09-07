import { HttpStatus, Injectable } from "@nestjs/common";
import type { DeleteData, IdShape, PublicUpload, Upload, UploadList, UploadListQuery, UploadStats } from "@snapshot/contracts";
import { idShapeFor, uploadIdSchema } from "@snapshot/contracts";
import type { Request } from "express";

import { AppException } from "../../common/exceptions/app.exception.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { type UploadRecord, UploadRepository } from "../../db/repositories/upload.repository.js";
import { type CachedUpload, CacheService } from "../../redis/cache.service.js";
import { IdAllocatorService } from "../ids/id-allocator.service.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";
import { detectContentType } from "./file-signatures.js";
import { probeDimensions } from "./media-dimensions.js";
import { StorageService } from "./storage.service.js";
import { ThumbnailService } from "./thumbnail.service.js";
import { parseUploadFilename, uploadFilename } from "./upload-filename.js";
import { toCachedUpload, toPublicUpload, toUpload } from "./upload-mapper.js";
import { UploadValidatorService } from "./upload-validator.service.js";
import { UploadWriterService } from "./upload-writer.service.js";
import { ViewTrackerService } from "./view-tracker.service.js";

export interface RawTarget {
	path: string;
	meta: CachedUpload;
}

@Injectable()
export class UploadService {
	constructor(
		private readonly storage: StorageService,
		private readonly writer: UploadWriterService,
		private readonly validator: UploadValidatorService,
		private readonly uploads: UploadRepository,
		private readonly cache: CacheService,
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly viewTracker: ViewTrackerService,
		private readonly ids: IdAllocatorService,
		private readonly thumbnails: ThumbnailService,
		private readonly config: AppConfigService,
	) {}

	private get baseUrl(): string {
		return this.config.env.BASE_URL;
	}

	async upload(request: Request): Promise<Upload> {
		const config = await this.runtimeConfig.get();
		const usedBytes = await this.storageInUse(config.maxTotalStorageBytes);
		this.assertStorageLeft(config.maxTotalStorageBytes, usedBytes, 0);
		const written = await this.writer.write(request, config);

		try {
			this.assertStorageLeft(config.maxTotalStorageBytes, usedBytes, written.sizeBytes);
			const dotExtension = written.extension;
			this.validator.validateExtension(dotExtension, config);
			this.validator.validateDeclaredContentType(dotExtension, written.declaredContentType, config);

			const detected = detectContentType(dotExtension, written.sample);
			this.validator.validateDetectedContentType(dotExtension, detected, config);

			const extension = dotExtension.slice(1);
			const id = await this.reserveId(idShapeFor(config, "upload"), extension, written.slug);
			const filename = uploadFilename(id, extension);

			await this.storage.commit(written.tempPath, filename);

			const sourcePath = this.storage.pathFor(filename);
			const dimensions = await probeDimensions(sourcePath, detected);
			const hasThumbnail = await this.thumbnails.create(sourcePath, id, detected);

			const record: UploadRecord = {
				id,
				extension,
				mimeType: detected,
				sizeBytes: written.sizeBytes,
				checksumSha256: written.checksumSha256,
				width: dimensions?.width ?? null,
				height: dimensions?.height ?? null,
				hasThumbnail,
				createdAt: new Date(),
			};
			await this.uploads.insert(record);

			const cached = toCachedUpload(record);
			await this.cache.addUpload(cached);

			return toUpload(cached, this.baseUrl);
		} catch (error) {
			await this.storage.discard(written.tempPath);
			throw error;
		}
	}

	async list(query: UploadListQuery): Promise<UploadList> {
		const offset = (query.page - 1) * query.perPage;
		const ids = await this.cache.recentUploadIds(offset, query.perPage);
		const cached = await this.cache.getUploads(ids);
		const metadata = await Promise.all(ids.map((id, index) => cached[index] ?? this.resolveFromRepository(id)));
		const items = metadata.filter((meta): meta is CachedUpload => meta !== null).map((meta) => toUpload(meta, this.baseUrl));

		return {
			items,
			total: await this.cache.countUploads(),
			page: query.page,
			perPage: query.perPage,
		};
	}

	async getPublic(id: string, request: Request): Promise<PublicUpload> {
		const upload = await this.findPublic(id, request);

		if (upload === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "File not found", "file_not_found");
		}

		return upload;
	}

	async findPublic(id: string, request: Request): Promise<PublicUpload | null> {
		const meta = await this.resolve(id);

		if (meta === null) {
			return null;
		}

		this.viewTracker.track(id, "page", request);

		return toPublicUpload(meta, this.baseUrl, await this.runtimeConfig.get());
	}

	async delete(id: string): Promise<DeleteData> {
		const meta = await this.requireMeta(id);
		const filename = uploadFilename(id, meta.extension);

		await this.storage.remove(filename);
		await this.thumbnails.remove(id);
		await this.uploads.deleteById(id);
		await this.cache.removeUpload(id);

		return { id, filename };
	}

	async stats(id: string): Promise<UploadStats> {
		await this.requireMeta(id);

		return { uploadId: id, views: await this.cache.readViewCounters(id) };
	}

	async locateRaw(filename: string): Promise<RawTarget | null> {
		const parsed = parseUploadFilename(filename);

		if (parsed === null) {
			return null;
		}

		const meta = await this.resolve(parsed.id);

		if (meta === null || meta.extension !== parsed.extension) {
			return null;
		}

		if (!(await this.storage.exists(filename))) {
			return null;
		}

		return { path: this.storage.pathFor(filename), meta };
	}

	async locateThumbnail(id: string): Promise<RawTarget | null> {
		const meta = await this.resolve(id);

		if (meta === null || !meta.hasThumbnail || !(await this.storage.thumbnailExists(id))) {
			return null;
		}

		return { path: this.storage.thumbnailPathFor(id), meta };
	}

	private async storageInUse(capBytes: number | null): Promise<number> {
		return capBytes === null ? 0 : (await this.uploads.totals()).totalSizeBytes;
	}

	private assertStorageLeft(capBytes: number | null, usedBytes: number, incomingBytes: number): void {
		if (capBytes === null || usedBytes + incomingBytes <= capBytes) {
			return;
		}

		throw new AppException(HttpStatus.INSUFFICIENT_STORAGE, "The instance has reached its storage limit", "storage_limit_reached");
	}

	private async reserveId(shape: IdShape, extension: string, requested: string | null): Promise<string> {
		if (requested === null) {
			return await this.ids.allocate(shape, (id) => this.storage.exists(uploadFilename(id, extension)));
		}

		const parsed = uploadIdSchema.safeParse(requested);

		if (!parsed.success) {
			throw new AppException(HttpStatus.BAD_REQUEST, parsed.error.issues[0]?.message ?? "Not a usable slug", "validation_error");
		}

		await this.ids.assertAvailable(parsed.data);

		if (await this.storage.exists(uploadFilename(parsed.data, extension))) {
			throw new AppException(HttpStatus.CONFLICT, `The id "${parsed.data}" is already in use`, "slug_unavailable");
		}

		return parsed.data;
	}

	private async resolve(id: string): Promise<CachedUpload | null> {
		const cached = await this.cache.getUpload(id);

		if (cached !== null) {
			return cached;
		}

		return this.resolveFromRepository(id);
	}

	private async resolveFromRepository(id: string): Promise<CachedUpload | null> {
		const record = await this.uploads.findById(id);

		if (record === null) {
			await this.cache.pruneUpload(id);
			return null;
		}

		const meta = toCachedUpload(record);
		await this.cache.setUpload(meta);

		return meta;
	}

	private async requireMeta(id: string): Promise<CachedUpload> {
		const meta = await this.resolve(id);

		if (meta === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "File not found", "file_not_found");
		}

		return meta;
	}
}

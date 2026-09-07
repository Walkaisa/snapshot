import { humanReadableSize, type PublicUpload, type RuntimeConfig, type Upload } from "@snapshot/contracts";

import type { UploadRecord } from "../../db/repositories/upload.repository.js";
import type { CachedUpload } from "../../redis/cache.service.js";
import { buildPublicEmbed } from "./upload-embed.js";
import { uploadFilename } from "./upload-filename.js";
import { buildPublicUploadUrls, buildUploadUrls } from "./upload-url.js";

export function toCachedUpload(record: UploadRecord): CachedUpload {
	return {
		id: record.id,
		extension: record.extension,
		mimeType: record.mimeType,
		sizeBytes: record.sizeBytes,
		checksumSha256: record.checksumSha256,
		width: record.width,
		height: record.height,
		hasThumbnail: record.hasThumbnail,
		createdAt: record.createdAt.toISOString(),
	};
}

export function toUpload(meta: CachedUpload, baseUrl: string): Upload {
	const filename = uploadFilename(meta.id, meta.extension);

	return {
		id: meta.id,
		extension: meta.extension,
		mimeType: meta.mimeType,
		sizeBytes: meta.sizeBytes,
		sizeHuman: humanReadableSize(meta.sizeBytes),
		checksumSha256: meta.checksumSha256,
		width: meta.width,
		height: meta.height,
		createdAt: meta.createdAt,
		...buildUploadUrls(baseUrl, meta.id, filename, meta.hasThumbnail),
	};
}

export function toPublicUpload(meta: CachedUpload, baseUrl: string, config: RuntimeConfig): PublicUpload {
	const filename = uploadFilename(meta.id, meta.extension);

	return {
		id: meta.id,
		extension: meta.extension,
		mimeType: meta.mimeType,
		sizeBytes: meta.sizeBytes,
		sizeHuman: humanReadableSize(meta.sizeBytes),
		checksumSha256: meta.checksumSha256,
		width: meta.width,
		height: meta.height,
		createdAt: meta.createdAt,
		...buildPublicUploadUrls(baseUrl, meta.id, filename, meta.hasThumbnail),
		embed: buildPublicEmbed(meta, config),
	};
}

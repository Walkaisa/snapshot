import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, type WriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Injectable, type OnModuleInit } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service.js";
import { parseUploadFilename } from "./upload-filename.js";

export interface StoredFile {
	id: string;
	extension: string;
	filename: string;
	sizeBytes: number;
	modifiedAt: Date;
}

const THUMBNAIL_DIRECTORY = "thumbnails";
const THUMBNAIL_EXTENSION = ".webp";

@Injectable()
export class StorageService implements OnModuleInit {
	readonly root: string;
	readonly thumbnailRoot: string;

	constructor(config: AppConfigService) {
		this.root = path.resolve(config.env.UPLOADS_DIR);
		this.thumbnailRoot = path.join(this.root, THUMBNAIL_DIRECTORY);
	}

	async onModuleInit(): Promise<void> {
		await mkdir(this.root, { recursive: true });
		await mkdir(this.thumbnailRoot, { recursive: true });
	}

	pathFor(filename: string): string {
		return path.join(this.root, filename);
	}

	thumbnailPathFor(id: string): string {
		return path.join(this.thumbnailRoot, `${id}${THUMBNAIL_EXTENSION}`);
	}

	async thumbnailExists(id: string): Promise<boolean> {
		try {
			await stat(this.thumbnailPathFor(id));
			return true;
		} catch {
			return false;
		}
	}

	async removeThumbnail(id: string): Promise<void> {
		await rm(this.thumbnailPathFor(id), { force: true });
	}

	async listFiles(): Promise<StoredFile[]> {
		const entries = await readdir(this.root, { withFileTypes: true });
		const files: StoredFile[] = [];

		for (const entry of entries) {
			if (!entry.isFile()) {
				continue;
			}

			const parsed = parseUploadFilename(entry.name);

			if (parsed === null) {
				continue;
			}

			const stats = await stat(this.pathFor(entry.name));
			files.push({
				...parsed,
				filename: entry.name,
				sizeBytes: stats.size,
				modifiedAt: stats.mtime,
			});
		}

		return files;
	}

	async checksum(filename: string): Promise<string> {
		const hash = createHash("sha256");

		for await (const chunk of createReadStream(this.pathFor(filename))) {
			hash.update(chunk as Buffer);
		}

		return hash.digest("hex");
	}

	async remove(filename: string): Promise<void> {
		await rm(this.pathFor(filename), { force: true });
	}

	async exists(filename: string): Promise<boolean> {
		try {
			await stat(this.pathFor(filename));
			return true;
		} catch {
			return false;
		}
	}

	createTempPath(): string {
		return path.join(this.root, `.upload-${randomUUID()}.tmp`);
	}

	openWriteStream(tempPath: string): WriteStream {
		return createWriteStream(tempPath);
	}

	async commit(tempPath: string, filename: string): Promise<void> {
		await rename(tempPath, this.pathFor(filename));
	}

	async discard(tempPath: string): Promise<void> {
		await rm(tempPath, { force: true });
	}
}

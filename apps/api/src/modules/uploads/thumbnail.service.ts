import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { supportsThumbnail, THUMBNAIL_MAX_EDGE } from "@snapshot/contracts";

import { StorageService } from "./storage.service.js";

const run = promisify(execFile);

const FFMPEG = "ffmpeg";
const TIMEOUT_MS = 20_000;
const SEEK_SECONDS = ["1", "0"];
const SCALE_FILTER = `scale='min(${THUMBNAIL_MAX_EDGE},iw)':-2`;

@Injectable()
export class ThumbnailService implements OnModuleInit {
	private readonly logger = new Logger(ThumbnailService.name);
	private encoderAvailable = false;

	constructor(private readonly storage: StorageService) {}

	async onModuleInit(): Promise<void> {
		this.encoderAvailable = await this.probeEncoder();

		if (!this.encoderAvailable) {
			this.logger.warn("ffmpeg is not available — video and GIF thumbnails are disabled");
		}
	}

	get available(): boolean {
		return this.encoderAvailable;
	}

	supports(mimeType: string): boolean {
		return this.encoderAvailable && supportsThumbnail(mimeType);
	}

	async create(sourcePath: string, id: string, mimeType: string): Promise<boolean> {
		if (!this.supports(mimeType)) {
			return false;
		}

		const target = this.storage.thumbnailPathFor(id);

		for (const seek of SEEK_SECONDS) {
			if (await this.extractFrame(sourcePath, target, seek)) {
				return await this.storage.thumbnailExists(id);
			}
		}

		this.logger.warn({ id, mimeType }, "Could not extract a thumbnail frame");
		await this.remove(id);

		return false;
	}

	async remove(id: string): Promise<void> {
		await this.storage.removeThumbnail(id);
	}

	private async extractFrame(sourcePath: string, target: string, seekSeconds: string): Promise<boolean> {
		try {
			await run(
				FFMPEG,
				[
					"-y",
					"-loglevel",
					"error",
					"-ss",
					seekSeconds,
					"-i",
					sourcePath,
					"-frames:v",
					"1",
					"-an",
					"-vf",
					SCALE_FILTER,
					"-f",
					"webp",
					target,
				],
				{ timeout: TIMEOUT_MS },
			);

			return true;
		} catch {
			return false;
		}
	}

	private async probeEncoder(): Promise<boolean> {
		try {
			const { stdout } = await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-encoders"], { timeout: TIMEOUT_MS });

			return stdout.includes("libwebp");
		} catch {
			return false;
		}
	}
}

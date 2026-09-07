import { Injectable, Logger } from "@nestjs/common";

import { UploadRepository } from "../../db/repositories/upload.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { StorageService } from "./storage.service.js";
import { ThumbnailService } from "./thumbnail.service.js";
import { uploadFilename } from "./upload-filename.js";
import { toCachedUpload } from "./upload-mapper.js";

@Injectable()
export class ThumbnailBackfillService {
	private readonly logger = new Logger(ThumbnailBackfillService.name);

	constructor(
		private readonly uploads: UploadRepository,
		private readonly storage: StorageService,
		private readonly thumbnails: ThumbnailService,
		private readonly cache: CacheService,
	) {}

	async backfill(): Promise<number> {
		if (!this.thumbnails.available) {
			return 0;
		}

		const pending = await this.uploads.findMissingThumbnails();

		if (pending.length === 0) {
			return 0;
		}

		this.logger.log(`Generating ${pending.length} missing thumbnail(s)`);
		let generated = 0;

		for (const record of pending) {
			const filename = uploadFilename(record.id, record.extension);

			if (!(await this.storage.exists(filename))) {
				continue;
			}

			if (!(await this.thumbnails.create(this.storage.pathFor(filename), record.id, record.mimeType))) {
				continue;
			}

			await this.uploads.markThumbnail(record.id, true);
			await this.cache.setUpload(toCachedUpload({ ...record, hasThumbnail: true }));
			generated += 1;
		}

		this.logger.log(`Generated ${generated} of ${pending.length} missing thumbnail(s)`);

		return generated;
	}
}

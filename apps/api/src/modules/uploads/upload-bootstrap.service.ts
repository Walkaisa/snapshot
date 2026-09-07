import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { UploadRepository } from "../../db/repositories/upload.repository.js";
import { UploadViewRepository } from "../../db/repositories/upload-view.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { ThumbnailBackfillService } from "./thumbnail-backfill.service.js";
import { toCachedUpload } from "./upload-mapper.js";
import { UploadReconcilerService } from "./upload-reconciler.service.js";

@Injectable()
export class UploadBootstrapService implements OnApplicationBootstrap {
	private readonly logger = new Logger(UploadBootstrapService.name);

	constructor(
		private readonly reconciler: UploadReconcilerService,
		private readonly uploads: UploadRepository,
		private readonly views: UploadViewRepository,
		private readonly cache: CacheService,
		private readonly thumbnails: ThumbnailBackfillService,
	) {}

	async onApplicationBootstrap(): Promise<void> {
		const summary = await this.reconciler.reconcile();
		const records = await this.uploads.findAll();
		const cachedIds = await this.cache.replaceUploads(records.map(toCachedUpload));

		await this.cache.replaceViewCounters(
			[...new Set([...cachedIds, ...records.map((record) => record.id)])],
			await this.views.countsAll(),
		);

		this.logger.log(`Uploads ready — ${records.length} tracked, ${summary.imported} imported, ${summary.orphans} orphaned`);

		void this.thumbnails.backfill().catch((error: unknown) => {
			this.logger.warn({ err: error }, "Thumbnail backfill failed");
		});
	}
}

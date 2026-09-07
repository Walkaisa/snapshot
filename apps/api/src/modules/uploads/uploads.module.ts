import { Module } from "@nestjs/common";
import { WriteRateLimitGuard } from "../../common/guards/write-rate-limit.guard.js";
import { DatabaseModule } from "../../db/database.module.js";
import { RedisModule } from "../../redis/redis.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { IdsModule } from "../ids/ids.module.js";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { RawController } from "./raw.controller.js";
import { StorageService } from "./storage.service.js";
import { ThumbnailService } from "./thumbnail.service.js";
import { ThumbnailBackfillService } from "./thumbnail-backfill.service.js";
import { UploadService } from "./upload.service.js";
import { UploadBootstrapService } from "./upload-bootstrap.service.js";
import { UploadReconcilerService } from "./upload-reconciler.service.js";
import { UploadValidatorService } from "./upload-validator.service.js";
import { UploadWriterService } from "./upload-writer.service.js";
import { UploadsController } from "./uploads.controller.js";
import { ViewTrackerService } from "./view-tracker.service.js";

@Module({
	imports: [DatabaseModule, RedisModule, RuntimeConfigModule, AuditModule, AuthModule, IdsModule],
	controllers: [UploadsController, RawController],
	providers: [
		StorageService,
		ThumbnailService,
		ThumbnailBackfillService,
		UploadReconcilerService,
		UploadBootstrapService,
		UploadWriterService,
		WriteRateLimitGuard,
		UploadValidatorService,
		ViewTrackerService,
		UploadService,
	],
	exports: [StorageService, UploadReconcilerService, UploadService],
})
export class UploadsModule {}

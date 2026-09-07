import { Module } from "@nestjs/common";

import { WriteRateLimitGuard } from "../../common/guards/write-rate-limit.guard.js";
import { DatabaseModule } from "../../db/database.module.js";
import { RedisModule } from "../../redis/redis.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { IdsModule } from "../ids/ids.module.js";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { LinkService } from "./link.service.js";
import { LinkVisitTrackerService } from "./link-visit-tracker.service.js";
import { LinksController } from "./links.controller.js";

@Module({
	imports: [DatabaseModule, RedisModule, RuntimeConfigModule, AuditModule, AuthModule, IdsModule],
	controllers: [LinksController],
	providers: [WriteRateLimitGuard, LinkVisitTrackerService, LinkService],
	exports: [LinkService],
})
export class LinksModule {}

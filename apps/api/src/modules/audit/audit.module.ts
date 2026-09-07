import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../db/database.module.js";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";
import { AuditBootstrapService } from "./audit-bootstrap.service.js";
import { AuditReaderService } from "./audit-reader.service.js";
import { AuditRetentionService } from "./audit-retention.service.js";

@Module({
	imports: [DatabaseModule, RuntimeConfigModule],
	controllers: [AuditController],
	providers: [AuditService, AuditReaderService, AuditRetentionService, AuditBootstrapService],
	exports: [AuditService],
})
export class AuditModule {}

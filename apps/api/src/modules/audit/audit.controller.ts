import { Controller, Get, Query } from "@nestjs/common";
import type { AuditPage, AuditSummary } from "@snapshot/contracts";

import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { AuditQueryDto } from "./audit.dto.js";
import { AuditReaderService } from "./audit-reader.service.js";

@Controller("audit")
export class AuditController {
	constructor(private readonly reader: AuditReaderService) {}

	@Get()
	@ResponseMessage("Audit log")
	list(@Query() query: AuditQueryDto): Promise<AuditPage> {
		return this.reader.list(query);
	}

	@Get("summary")
	@ResponseMessage("Audit summary")
	summary(@Query() query: AuditQueryDto): Promise<AuditSummary> {
		return this.reader.summary(query);
	}
}

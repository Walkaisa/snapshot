import { Body, Controller, Get, Patch } from "@nestjs/common";
import type { ConfigView } from "@snapshot/contracts";

import { AuditAction, requestBody } from "../../common/decorators/audit.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";
import { ConfigUpdateDto } from "./config.dto.js";
import { toConfigView } from "./config.mapper.js";

@Controller("config")
export class ConfigController {
	constructor(private readonly runtimeConfig: RuntimeConfigService) {}

	@Get()
	@ResponseMessage("Configuration")
	async get(): Promise<ConfigView> {
		return toConfigView(await this.runtimeConfig.get());
	}

	@Patch()
	@AuditAction("config.update", { metadata: (_result, request) => requestBody(request) })
	@ResponseMessage("Configuration updated")
	async update(@Body() dto: ConfigUpdateDto): Promise<ConfigView> {
		return toConfigView(await this.runtimeConfig.update(dto));
	}
}

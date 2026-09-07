import { Controller, Get, HttpCode, HttpStatus, Post, Res } from "@nestjs/common";
import type { ApiKeyData } from "@snapshot/contracts";
import type { Response } from "express";

import { AuditAction } from "../../common/decorators/audit.decorator.js";
import { ResponseMessage, SkipEnvelope } from "../../common/decorators/response.decorator.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";
import { ShareXService } from "./sharex.service.js";

@Controller()
export class ShareXController {
	constructor(
		private readonly sharex: ShareXService,
		private readonly runtimeConfig: RuntimeConfigService,
	) {}

	@Get("sharex")
	@SkipEnvelope()
	async config(@Res() response: Response): Promise<void> {
		const { filename, content } = await this.sharex.configFile();

		response.set({
			"Content-Type": "application/json; charset=utf-8",
			"Content-Disposition": `attachment; filename="${filename}"`,
		});
		response.send(content);
	}

	@Get("api-key")
	@AuditAction("api_key.reveal")
	@ResponseMessage("API key")
	async apiKey(): Promise<ApiKeyData> {
		return { apiKey: (await this.runtimeConfig.get()).apiKey };
	}

	@Post("api-key/rotate")
	@HttpCode(HttpStatus.OK)
	@AuditAction("api_key.rotate")
	@ResponseMessage("API key rotated")
	async rotate(): Promise<ApiKeyData> {
		return { apiKey: await this.runtimeConfig.rotateApiKey() };
	}
}

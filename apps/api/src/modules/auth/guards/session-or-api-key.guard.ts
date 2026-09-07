import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { AppException } from "../../../common/exceptions/app.exception.js";
import { getRequestId } from "../../../common/utils/request-id.js";
import { AuditService } from "../../audit/audit.service.js";
import { RuntimeConfigService } from "../../runtime-config/runtime-config.service.js";
import { apiKeyMatches, extractApiKey } from "../api-key.util.js";

@Injectable()
export class SessionOrApiKeyGuard implements CanActivate {
	constructor(
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly audit: AuditService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();

		if (request.isAuthenticated()) {
			return true;
		}

		const config = await this.runtimeConfig.get();

		const provided = extractApiKey(request);

		if (apiKeyMatches(provided, config.apiKey)) {
			return true;
		}

		this.audit.record({
			action: provided === null ? "security.unauthorized" : "security.api_key_rejected",
			outcome: "failure",
			actor: provided === null ? "anonymous" : "api_key",
			errorCode: "unauthorized",
			requestId: getRequestId(request),
			method: request.method,
			path: request.originalUrl,
			ipAddress: request.ip ?? null,
			userAgent: request.get("user-agent") ?? null,
		});

		throw new AppException(HttpStatus.UNAUTHORIZED, "Authentication required", "unauthorized");
	}
}

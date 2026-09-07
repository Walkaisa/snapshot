import { type CanActivate, type ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { CsrfSync } from "csrf-sync";
import type { Request, Response } from "express";

import { AppException } from "../../../common/exceptions/app.exception.js";
import { getRequestId } from "../../../common/utils/request-id.js";
import { AuditService } from "../../audit/audit.service.js";
import { RuntimeConfigService } from "../../runtime-config/runtime-config.service.js";
import { apiKeyMatches, extractApiKey } from "../api-key.util.js";
import { CSRF } from "../auth.constants.js";

@Injectable()
export class CsrfGuard implements CanActivate {
	constructor(
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly audit: AuditService,
		@Inject(CSRF) private readonly csrf: CsrfSync,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const http = context.switchToHttp();
		const request = http.getRequest<Request>();

		if (await this.isApiKeyRequest(request)) {
			return true;
		}

		const response = http.getResponse<Response>();

		return new Promise<boolean>((resolve, reject) => {
			this.csrf.csrfSynchronisedProtection(request, response, (error?: unknown) => {
				if (error) {
					this.audit.record({
						action: "security.csrf_rejected",
						outcome: "failure",
						actor: request.isAuthenticated?.() ? "dashboard" : "anonymous",
						errorCode: "forbidden",
						requestId: getRequestId(request),
						method: request.method,
						path: request.originalUrl,
						ipAddress: request.ip ?? null,
						userAgent: request.get("user-agent") ?? null,
					});
					reject(new AppException(HttpStatus.FORBIDDEN, "Invalid or missing CSRF token", "forbidden"));
				} else {
					resolve(true);
				}
			});
		});
	}

	private async isApiKeyRequest(request: Request): Promise<boolean> {
		const provided = extractApiKey(request);

		if (provided === null) {
			return false;
		}

		if (!apiKeyMatches(provided, (await this.runtimeConfig.get()).apiKey)) {
			this.audit.record({
				action: "security.api_key_rejected",
				outcome: "failure",
				actor: "api_key",
				errorCode: "unauthorized",
				requestId: getRequestId(request),
				method: request.method,
				path: request.originalUrl,
				ipAddress: request.ip ?? null,
				userAgent: request.get("user-agent") ?? null,
			});

			throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid API key", "unauthorized");
		}

		return true;
	}
}

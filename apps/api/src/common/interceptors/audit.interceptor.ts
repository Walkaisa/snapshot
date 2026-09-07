import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuditActor } from "@snapshot/contracts";
import type { Request } from "express";
import { type Observable, tap } from "rxjs";

import { AuditService } from "../../modules/audit/audit.service.js";
import { AUDIT_ACTION_KEY, type AuditRoute } from "../decorators/audit.decorator.js";
import { AppException } from "../exceptions/app.exception.js";
import { getRequestId } from "../utils/request-id.js";

const API_KEY_HEADERS = ["x-api-key", "authorization"];

function actorOf(request: Request): AuditActor {
	if (request.isAuthenticated?.()) {
		return "dashboard";
	}

	return API_KEY_HEADERS.some((header) => request.headers[header] !== undefined) ? "api_key" : "anonymous";
}

function safely<T>(read: () => T | null | undefined): T | null {
	try {
		return read() ?? null;
	} catch {
		return null;
	}
}

function errorCodeOf(error: unknown): string | null {
	return error instanceof AppException ? error.errorCode : "internal_server_error";
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
	constructor(
		private readonly reflector: Reflector,
		private readonly audit: AuditService,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const route = this.reflector.getAllAndOverride<AuditRoute>(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]);

		if (route === undefined) {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest<Request>();
		const startedAt = Date.now();

		const base = {
			action: route.action,
			actor: actorOf(request),
			requestId: getRequestId(request),
			method: request.method,
			path: request.originalUrl,
			ipAddress: request.ip ?? null,
			userAgent: request.get("user-agent") ?? null,
		};

		return next.handle().pipe(
			tap({
				next: (result) => {
					this.audit.record({
						...base,
						outcome: "success",
						durationMs: Date.now() - startedAt,
						targetId: safely(() => route.id?.(result, request)),
						metadata: safely(() => route.metadata?.(result, request)),
					});
				},
				error: (error: unknown) => {
					this.audit.record({
						...base,
						outcome: "failure",
						durationMs: Date.now() - startedAt,
						targetId: safely(() => route.id?.(undefined, request)),
						errorCode: errorCodeOf(error),
					});
				},
			}),
		);
	}
}

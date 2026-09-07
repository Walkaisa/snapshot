import { type CanActivate, type ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { Redis } from "ioredis";

import { AppConfigService } from "../../config/app-config.service.js";
import { AuditService } from "../../modules/audit/audit.service.js";
import { RuntimeConfigService } from "../../modules/runtime-config/runtime-config.service.js";
import { REDIS, redisKeys } from "../../redis/redis.constants.js";
import { AppException } from "../exceptions/app.exception.js";
import { hashIp } from "../utils/ip-hash.js";
import { getRequestId } from "../utils/request-id.js";

const ANONYMOUS_CLIENT = "anonymous";

@Injectable()
export class WriteRateLimitGuard implements CanActivate {
	constructor(
		@Inject(REDIS) private readonly redis: Redis,
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly config: AppConfigService,
		private readonly audit: AuditService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const runtime = await this.runtimeConfig.get();

		if (!runtime.rateLimitEnabled) {
			return true;
		}

		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const client = hashIp(request.ip, this.config.env.SESSION_SECRET) ?? ANONYMOUS_CLIENT;
		const key = redisKeys.writeRateLimit(client, runtime.rateLimitWindowSeconds);
		const [hits, ttl] = await this.consume(key, runtime.rateLimitWindowSeconds);

		if (hits <= runtime.rateLimitRequests) {
			return true;
		}

		const retryAfter = ttl > 0 ? ttl : runtime.rateLimitWindowSeconds;
		http.getResponse<Response>().setHeader("Retry-After", String(retryAfter));

		this.audit.record({
			action: "security.rate_limited",
			outcome: "failure",
			errorCode: "rate_limit_exceeded",
			requestId: getRequestId(request),
			method: request.method,
			path: request.originalUrl,
			ipAddress: request.ip ?? null,
			userAgent: request.get("user-agent") ?? null,
			metadata: { limit: runtime.rateLimitRequests, windowSeconds: runtime.rateLimitWindowSeconds, retryAfter },
		});

		throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "Rate limit exceeded", "rate_limit_exceeded");
	}

	private async consume(key: string, windowSeconds: number): Promise<[hits: number, ttlSeconds: number]> {
		const results = await this.redis.multi().incr(key).expire(key, windowSeconds, "NX").ttl(key).exec();

		if (results === null) {
			throw new Error("Redis pipeline returned no results");
		}

		for (const [error] of results) {
			if (error !== null) {
				throw error;
			}
		}

		return [Number(results[0]?.[1] ?? 0), Number(results[2]?.[1] ?? 0)];
	}
}

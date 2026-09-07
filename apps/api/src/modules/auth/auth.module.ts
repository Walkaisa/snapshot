import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { Inject, Module, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import type { Redis } from "ioredis";
import type { RedisClientType } from "redis";

import { DatabaseModule } from "../../db/database.module.js";
import { REDIS } from "../../redis/redis.constants.js";
import { RedisModule } from "../../redis/redis.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import {
	AUTH_IP_THROTTLER,
	AUTH_SUSTAINED_THROTTLE_BLOCK_MS,
	AUTH_SUSTAINED_THROTTLE_TTL_MS,
	AUTH_SUSTAINED_THROTTLER,
	AUTH_THROTTLE_BLOCK_MS,
	AUTH_THROTTLE_TTL_MS,
	SESSION_REDIS,
	SESSION_STORE,
} from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthenticatedGuard } from "./guards/authenticated.guard.js";
import { CsrfGuard } from "./guards/csrf.guard.js";
import { SessionOrApiKeyGuard } from "./guards/session-or-api-key.guard.js";
import { LocalStrategy } from "./local.strategy.js";
import { MfaController } from "./mfa.controller.js";
import { MfaService } from "./mfa.service.js";
import { PasswordHasher } from "./password-hasher.service.js";
import { csrfProvider, sessionRedisProvider, sessionStoreProvider } from "./session.providers.js";
import { SessionSerializer } from "./session.serializer.js";
import { SessionManagerService } from "./session-manager.service.js";
import { SessionRegistryService } from "./session-registry.service.js";

const DEFAULT_THROTTLE_LIMIT = 100;

@Module({
	imports: [
		DatabaseModule,
		RedisModule,
		RuntimeConfigModule,
		AuditModule,
		PassportModule.register({ session: true }),
		ThrottlerModule.forRootAsync({
			imports: [RedisModule],
			inject: [REDIS],
			useFactory: (redis: Redis) => ({
				throttlers: [
					{ name: "default", limit: DEFAULT_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS, blockDuration: AUTH_THROTTLE_BLOCK_MS },
					{
						name: AUTH_SUSTAINED_THROTTLER,
						limit: DEFAULT_THROTTLE_LIMIT,
						ttl: AUTH_SUSTAINED_THROTTLE_TTL_MS,
						blockDuration: AUTH_SUSTAINED_THROTTLE_BLOCK_MS,
					},
					{
						name: AUTH_IP_THROTTLER,
						limit: DEFAULT_THROTTLE_LIMIT,
						ttl: AUTH_THROTTLE_TTL_MS,
						blockDuration: AUTH_THROTTLE_BLOCK_MS,
					},
				],
				storage: new ThrottlerStorageRedisService(redis),
			}),
		}),
	],
	controllers: [AuthController, MfaController],
	providers: [
		PasswordHasher,
		AuthService,
		MfaService,
		LocalStrategy,
		SessionSerializer,
		SessionRegistryService,
		SessionManagerService,
		SessionOrApiKeyGuard,
		sessionRedisProvider,
		sessionStoreProvider,
		csrfProvider,
		{ provide: APP_GUARD, useClass: AuthenticatedGuard },
		{ provide: APP_GUARD, useClass: CsrfGuard },
	],
	exports: [ThrottlerModule, AuditModule, SESSION_STORE, MfaService, SessionOrApiKeyGuard, SessionRegistryService, PasswordHasher],
})
export class AuthModule implements OnModuleInit, OnApplicationShutdown {
	constructor(@Inject(SESSION_REDIS) private readonly client: RedisClientType) {}

	async onModuleInit(): Promise<void> {
		await this.client.connect();
	}

	async onApplicationShutdown(): Promise<void> {
		if (this.client.isOpen) {
			await this.client.quit();
		}
	}
}

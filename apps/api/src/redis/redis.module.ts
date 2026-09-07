import { Inject, Module, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";

import { AppConfigService } from "../config/app-config.service.js";
import { CacheService } from "./cache.service.js";
import { REDIS } from "./redis.constants.js";

@Module({
	providers: [
		{
			provide: REDIS,
			inject: [AppConfigService],
			useFactory: (config: AppConfigService) =>
				new Redis(config.env.REDIS_URL, {
					enableAutoPipelining: true,
					lazyConnect: true,
					maxRetriesPerRequest: null,
				}),
		},
		CacheService,
	],
	exports: [REDIS, CacheService],
})
export class RedisModule implements OnModuleInit, OnApplicationShutdown {
	constructor(@Inject(REDIS) private readonly redis: Redis) {}

	async onModuleInit(): Promise<void> {
		await this.redis.connect();
		await this.redis.ping();
	}

	async onApplicationShutdown(): Promise<void> {
		if (this.redis.status !== "end") {
			await this.redis.quit();
		}
	}
}

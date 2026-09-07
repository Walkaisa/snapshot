import { HttpStatus, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { type ConfigUpdate, type RuntimeConfig, runtimeConfigSchema } from "@snapshot/contracts";

import { AppException } from "../../common/exceptions/app.exception.js";
import { ConfigRepository } from "../../db/repositories/config.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { redisKeys } from "../../redis/redis.constants.js";
import {
	defaultRuntimeConfig,
	generateApiKey,
	narrowToMediaConfig,
	SHARED_ID_CONFIG_KEYS,
	splitSharedIdConfig,
} from "./runtime-config.defaults.js";

@Injectable()
export class RuntimeConfigService implements OnModuleInit {
	private readonly logger = new Logger(RuntimeConfigService.name);

	constructor(
		private readonly repository: ConfigRepository,
		private readonly cache: CacheService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.seedMissingDefaults();
		await this.get();
	}

	async get(): Promise<RuntimeConfig> {
		const cached = await this.cache.getJson<unknown>(redisKeys.runtimeConfig);
		const parsedCache = runtimeConfigSchema.safeParse(cached);

		if (parsedCache.success) {
			return parsedCache.data;
		}

		const config = runtimeConfigSchema.parse(await this.repository.readAll());
		await this.cache.setJson(redisKeys.runtimeConfig, config);

		return config;
	}

	async update(patch: ConfigUpdate): Promise<RuntimeConfig> {
		const current = await this.get();
		const merged = runtimeConfigSchema.safeParse({ ...current, ...patch });

		if (!merged.success) {
			throw new AppException(
				HttpStatus.BAD_REQUEST,
				"Validation failed",
				"validation_error",
				merged.error.issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message })),
			);
		}

		const next = merged.data;

		const changed = Object.fromEntries(Object.keys(patch).map((key) => [key, next[key as keyof RuntimeConfig]]));

		await this.repository.upsertMany(changed);
		await this.cache.setJson(redisKeys.runtimeConfig, next);

		return next;
	}

	async invalidate(): Promise<void> {
		await this.cache.del(redisKeys.runtimeConfig);
	}

	async rotateApiKey(): Promise<string> {
		const apiKey = generateApiKey();
		await this.repository.upsertMany({ apiKey });
		await this.invalidate();

		return apiKey;
	}

	private async seedMissingDefaults(): Promise<void> {
		const stored = await this.repository.readAll();
		const split = splitSharedIdConfig(stored);
		const narrowed = narrowToMediaConfig(stored);
		const missing = Object.fromEntries(Object.entries(defaultRuntimeConfig()).filter(([key]) => !(key in stored) && !(key in split)));
		const seeded = { ...split, ...narrowed, ...missing };
		const shared = SHARED_ID_CONFIG_KEYS.filter((key) => key in stored);
		const keys = Object.keys(seeded);

		if (keys.length === 0 && shared.length === 0) {
			return;
		}

		for (const key of Object.keys(narrowed)) {
			this.logger.warn(`Dropped non-media entries from ${key} — Snapshot only stores images and video`);
		}

		await this.repository.upsertMany(seeded);
		await this.repository.deleteMany(shared);
		await this.invalidate();
		this.logger.log(`Seeded ${keys.length} runtime config key(s)`);
	}
}

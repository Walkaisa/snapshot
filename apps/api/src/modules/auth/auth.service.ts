import { randomBytes } from "node:crypto";
import { HttpStatus, Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { AppException } from "../../common/exceptions/app.exception.js";
import { type AdminRecord, AdminRepository } from "../../db/repositories/admin.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { redisKeys } from "../../redis/redis.constants.js";
import type { AuthAdmin } from "./auth.types.js";
import { PasswordHasher } from "./password-hasher.service.js";

const INITIALIZED_CACHE_TTL_SECONDS = 60;

function toAuthAdmin(record: AdminRecord): AuthAdmin {
	return { id: record.id, username: record.username, theme: record.theme, locale: record.locale };
}

@Injectable()
export class AuthService implements OnModuleInit {
	private readonly logger = new Logger(AuthService.name);
	private dummyHash = "";

	constructor(
		private readonly admins: AdminRepository,
		private readonly hasher: PasswordHasher,
		private readonly cache: CacheService,
	) {}

	async onModuleInit(): Promise<void> {
		this.dummyHash = await this.hasher.hash(randomBytes(24).toString("hex"));
	}

	async isInitialized(): Promise<boolean> {
		const cached = await this.cache.getJson<unknown>(redisKeys.authInitialized);

		if (typeof cached === "boolean") {
			return cached;
		}

		if (cached !== null) {
			await this.cache.del(redisKeys.authInitialized);
		}

		const initialized = (await this.admins.count()) > 0;
		await this.cache.setJson(redisKeys.authInitialized, initialized, INITIALIZED_CACHE_TTL_SECONDS);

		return initialized;
	}

	async findById(id: string): Promise<AuthAdmin | null> {
		const record = await this.admins.findById(id);

		return record === null ? null : toAuthAdmin(record);
	}

	async createInitialAdmin(username: string, password: string): Promise<AuthAdmin> {
		if (await this.isInitialized()) {
			throw new AppException(HttpStatus.CONFLICT, "Setup has already been completed", "conflict");
		}

		const passwordHash = await this.hasher.hash(password);
		const record = await this.admins.createInitial(username, passwordHash);

		if (record === null) {
			await this.cache.setJson(redisKeys.authInitialized, true, INITIALIZED_CACHE_TTL_SECONDS);
			throw new AppException(HttpStatus.CONFLICT, "Setup has already been completed", "conflict");
		}

		await this.cache.setJson(redisKeys.authInitialized, true, INITIALIZED_CACHE_TTL_SECONDS);

		return toAuthAdmin(record);
	}

	async validateCredentials(username: string, password: string): Promise<AuthAdmin | null> {
		const record = await this.admins.findByUsername(username);

		if (record === null) {
			await this.hasher.verify(this.dummyHash, password);
			return null;
		}

		if (!(await this.hasher.verify(record.passwordHash, password))) {
			return null;
		}

		await this.rehashIfNeeded(record, password);

		return toAuthAdmin(record);
	}

	async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
		const record = await this.admins.findById(id);

		if (record === null || !(await this.hasher.verify(record.passwordHash, currentPassword))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Current password is incorrect", "unauthorized");
		}

		await this.admins.updatePassword(id, await this.hasher.hash(newPassword));
	}

	private async rehashIfNeeded(record: AdminRecord, password: string): Promise<void> {
		if (!this.hasher.needsRehash(record.passwordHash)) {
			return;
		}

		try {
			await this.admins.updatePassword(record.id, await this.hasher.hash(password));
		} catch (error) {
			this.logger.warn({ err: error }, "Password rehash failed");
		}
	}
}

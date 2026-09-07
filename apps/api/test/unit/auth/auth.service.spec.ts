import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminRepository } from "../../../src/db/repositories/admin.repository.js";
import { AuthService } from "../../../src/modules/auth/auth.service.js";
import type { PasswordHasher } from "../../../src/modules/auth/password-hasher.service.js";
import type { CacheService } from "../../../src/redis/cache.service.js";
import { redisKeys } from "../../../src/redis/redis.constants.js";

const { count, getJson, setJson } = vi.hoisted(() => ({
	count: vi.fn(),
	getJson: vi.fn(),
	setJson: vi.fn(),
}));

function createService(): AuthService {
	return new AuthService({ count } as unknown as AdminRepository, {} as PasswordHasher, { getJson, setJson } as unknown as CacheService);
}

beforeEach(() => {
	count.mockReset();
	getJson.mockReset();
	setJson.mockReset();
});

describe("AuthService initialization cache", () => {
	it("serves the frequent auth-state check from Redis", async () => {
		getJson.mockResolvedValue(true);

		await expect(createService().isInitialized()).resolves.toBe(true);
		expect(count).not.toHaveBeenCalled();
	});

	it("populates Redis after a database fallback", async () => {
		getJson.mockResolvedValue(null);
		count.mockResolvedValue(1);

		await expect(createService().isInitialized()).resolves.toBe(true);
		expect(setJson).toHaveBeenCalledWith(redisKeys.authInitialized, true, 60);
	});
});

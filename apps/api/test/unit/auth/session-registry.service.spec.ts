import type { RedisStore } from "connect-redis";
import type { RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";

import { SessionRegistryService } from "../../../src/modules/auth/session-registry.service.js";

describe("SessionRegistryService", () => {
	it("counts only live sessions and prunes expired index members", async () => {
		const sRem = vi.fn().mockResolvedValue(1);
		const redis = {
			sMembers: vi.fn().mockResolvedValue(["live", "expired"]),
			sRem,
		} as unknown as RedisClientType;
		const store = {
			get: vi
				.fn()
				.mockImplementation((id: string) => Promise.resolve(id === "live" ? { createdAt: "2026-07-21T12:00:00.000Z" } : null)),
		} as unknown as RedisStore;
		const registry = new SessionRegistryService(redis, store);

		await expect(registry.count("admin-id")).resolves.toBe(1);
		expect(sRem).toHaveBeenCalledWith("snapshot:admin_sessions:admin-id", ["expired"]);
	});

	it("loads session details concurrently", async () => {
		let resolveFirst: ((value: object) => void) | undefined;
		const first = new Promise<object>((resolve) => {
			resolveFirst = resolve;
		});
		const storeGet = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce({ createdAt: "2026-07-21T13:00:00.000Z" });
		const redis = {
			sMembers: vi.fn().mockResolvedValue(["first", "second"]),
			sRem: vi.fn(),
		} as unknown as RedisClientType;
		const registry = new SessionRegistryService(redis, { get: storeGet } as unknown as RedisStore);
		const listing = registry.list("admin-id", "second");

		await vi.waitFor(() => expect(storeGet).toHaveBeenCalledTimes(2));
		resolveFirst?.({ createdAt: "2026-07-21T12:00:00.000Z" });

		await expect(listing).resolves.toHaveLength(2);
	});
});

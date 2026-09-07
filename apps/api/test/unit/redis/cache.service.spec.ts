import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";

import { CacheService } from "../../../src/redis/cache.service.js";
import { redisKeys } from "../../../src/redis/redis.constants.js";

const cachedUpload = {
	id: "abc123XYZ9",
	extension: "png",
	mimeType: "image/png",
	sizeBytes: "42",
	checksumSha256: "a".repeat(64),
	width: "800",
	height: "600",
	hasThumbnail: "1",
	createdAt: "2026-07-21T12:00:00.000Z",
};

describe("CacheService", () => {
	it("batches upload metadata reads into one pipeline", async () => {
		const pipeline = {
			exec: vi.fn().mockResolvedValue([
				[null, cachedUpload],
				[null, {}],
			]),
			hgetall: vi.fn(),
		};
		pipeline.hgetall.mockReturnValue(pipeline);
		const redis = { pipeline: vi.fn().mockReturnValue(pipeline) } as unknown as Redis;
		const cache = new CacheService(redis);

		const uploads = await cache.getUploads(["abc123XYZ9", "missing123"]);

		expect(pipeline.hgetall).toHaveBeenCalledTimes(2);
		expect(pipeline.exec).toHaveBeenCalledOnce();
		expect(uploads).toEqual([
			{
				...cachedUpload,
				sizeBytes: 42,
				width: 800,
				height: 600,
				hasThumbnail: true,
			},
			null,
		]);
	});

	it("deletes malformed JSON and treats it as a cache miss", async () => {
		const del = vi.fn().mockResolvedValue(1);
		const redis = { del, get: vi.fn().mockResolvedValue("{broken") } as unknown as Redis;
		const cache = new CacheService(redis);

		await expect(cache.getJson("cache:key")).resolves.toBeNull();
		expect(del).toHaveBeenCalledWith("cache:key");
	});

	it("increments the hot counter and cached overview atomically", async () => {
		const evaluate = vi.fn().mockResolvedValue(7);
		const redis = { eval: evaluate } as unknown as Redis;
		const cache = new CacheService(redis);

		await expect(cache.incrementView("abc123XYZ9", "raw")).resolves.toBe(7);
		expect(evaluate).toHaveBeenCalledWith(
			expect.any(String),
			2,
			redisKeys.viewCounter("abc123XYZ9", "raw"),
			redisKeys.statsOverview,
			"raw",
		);
	});
});

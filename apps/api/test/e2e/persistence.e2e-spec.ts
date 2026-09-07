import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { ConfigRepository } from "../../src/db/repositories/config.repository.js";
import { UploadRepository } from "../../src/db/repositories/upload.repository.js";
import { UploadViewRepository } from "../../src/db/repositories/upload-view.repository.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { RuntimeConfigService } from "../../src/modules/runtime-config/runtime-config.service.js";
import { UploadReconcilerService } from "../../src/modules/uploads/upload-reconciler.service.js";
import { CacheService } from "../../src/redis/cache.service.js";
import { redisKeys } from "../../src/redis/redis.constants.js";
import { TEST_REDIS_URL } from "../test-env.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const FIXTURE_ID = "abc123XYZ9";
const FIXTURE_CONTENT = "fake png bytes";
const FIXTURE_CHECKSUM = createHash("sha256").update(FIXTURE_CONTENT).digest("hex");

describe("persistence (e2e)", () => {
	let app: INestApplication;
	let uploadsDir: string;
	let previousUploadsDir: string | undefined;

	let configRepository: ConfigRepository;
	let uploadRepository: UploadRepository;
	let uploadViewRepository: UploadViewRepository;
	let runtimeConfig: RuntimeConfigService;
	let cache: CacheService;

	beforeAll(async () => {
		previousUploadsDir = process.env.UPLOADS_DIR;
		uploadsDir = await mkdtemp(path.join(tmpdir(), "snapshot-persistence-"));
		await writeFile(path.join(uploadsDir, `${FIXTURE_ID}.png`), FIXTURE_CONTENT);
		process.env.UPLOADS_DIR = uploadsDir;

		await resetDatabase();
		await resetRedis();
		const staleRedis = new Redis(TEST_REDIS_URL);

		try {
			await staleRedis.hset(redisKeys.upload("staleCache1"), {
				id: "staleCache1",
				extension: "png",
				mimeType: "image/png",
				sizeBytes: "99",
				checksumSha256: "f".repeat(64),
				width: "",
				height: "",
				createdAt: new Date(0).toISOString(),
			});
			await staleRedis.zadd(redisKeys.uploadsIndex, 0, "staleCache1");
			await staleRedis.set(redisKeys.viewCounter(FIXTURE_ID, "page"), "99");
			await staleRedis.set(redisKeys.viewCounter("staleCache1", "raw"), "99");
			await staleRedis.set(redisKeys.statsOverview, JSON.stringify({ stale: true }));
		} finally {
			await staleRedis.quit();
		}

		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(RELEASE_CHECKER)
			.useValue({ latestVersion: () => Promise.resolve(null) })
			.compile();

		app = moduleRef.createNestApplication({ bufferLogs: false });
		configureApp(app);
		await app.listen(0);

		configRepository = app.get(ConfigRepository);
		uploadRepository = app.get(UploadRepository);
		uploadViewRepository = app.get(UploadViewRepository);
		runtimeConfig = app.get(RuntimeConfigService);
		cache = app.get(CacheService);
	});

	afterAll(async () => {
		await app.close();
		await rm(uploadsDir, { recursive: true, force: true });

		if (previousUploadsDir !== undefined) {
			process.env.UPLOADS_DIR = previousUploadsDir;
		}
	});

	describe("migrations and seeding", () => {
		it("seeds a valid runtime config on first boot", async () => {
			const config = await runtimeConfig.get();

			expect(config.apiKey.length).toBeGreaterThanOrEqual(32);
			expect(config.embedProviderName).toBe("Snapshot");
			expect(config.timezone).toBe("UTC");
		});

		it("stores null config values as JSON null rather than SQL NULL", async () => {
			const stored = await configRepository.readAll();

			expect(stored.allowedExtensions).toBeNull();
			expect(stored.allowedMimeTypes).toBeNull();
		});

		it("persists config keys in snake_case", async () => {
			const stored = await configRepository.readAll();

			expect(stored).toHaveProperty("embedThemeColor");
			expect(Object.keys(stored)).not.toContain("embed_theme_color");
		});
	});

	describe("startup reconciliation", () => {
		it("imports the untracked file found on disk", async () => {
			const record = await uploadRepository.findById(FIXTURE_ID);

			expect(record).not.toBeNull();
			expect(record?.extension).toBe("png");
			expect(record?.mimeType).toBe("image/png");
			expect(record?.sizeBytes).toBe(Buffer.byteLength(FIXTURE_CONTENT));
			expect(record?.checksumSha256).toBe(FIXTURE_CHECKSUM);
		});

		it("warms the redis upload cache and index", async () => {
			const cached = await cache.getUpload(FIXTURE_ID);

			expect(cached?.id).toBe(FIXTURE_ID);
			expect(cached?.sizeBytes).toBe(Buffer.byteLength(FIXTURE_CONTENT));
			expect(await cache.recentUploadIds()).toContain(FIXTURE_ID);
		});

		it("replaces stale upload, counter and aggregate cache state", async () => {
			expect(await cache.getUpload("staleCache1")).toBeNull();
			expect(await cache.recentUploadIds()).not.toContain("staleCache1");
			expect(await cache.readViewCounters(FIXTURE_ID)).toEqual({ page: 0, raw: 0, download: 0, total: 0 });
			expect(await cache.readViewCounters("staleCache1")).toEqual({ page: 0, raw: 0, download: 0, total: 0 });
			expect(await cache.getJson(redisKeys.statsOverview)).toBeNull();
		});
	});

	describe("runtime config round-trip", () => {
		it("writes an update to postgres and refreshes the cache", async () => {
			const updated = await runtimeConfig.update({ embedProviderName: "Acme" });
			expect(updated.embedProviderName).toBe("Acme");

			const stored = await configRepository.readAll();
			expect(stored.embedProviderName).toBe("Acme");

			await runtimeConfig.invalidate();
			const reread = await runtimeConfig.get();
			expect(reread.embedProviderName).toBe("Acme");
		});

		it("round-trips a nullable list value", async () => {
			await runtimeConfig.update({ allowedExtensions: ".png,.jpg" });
			expect((await runtimeConfig.get()).allowedExtensions).toBe(".png,.jpg");

			await runtimeConfig.update({ allowedExtensions: null });
			await runtimeConfig.invalidate();
			expect((await runtimeConfig.get()).allowedExtensions).toBeNull();
		});

		it("rejects an invalid value without touching the stored config", async () => {
			await expect(runtimeConfig.update({ embedThemeColor: "notacolor" })).rejects.toThrow();

			const stored = await configRepository.readAll();
			expect(stored.embedThemeColor).toBe("#5865F2");
		});
	});

	describe("upload views", () => {
		it("aggregates view counts per type", async () => {
			await uploadViewRepository.insert({ uploadId: FIXTURE_ID, viewType: "page" });
			await uploadViewRepository.insert({ uploadId: FIXTURE_ID, viewType: "raw" });
			await uploadViewRepository.insert({ uploadId: FIXTURE_ID, viewType: "raw" });

			const counts = await uploadViewRepository.countsFor(FIXTURE_ID);

			expect(counts).toEqual({ page: 1, raw: 2, download: 0, total: 3 });
		});

		it("tracks hot counters in redis", async () => {
			await cache.incrementView(FIXTURE_ID, "page");
			await cache.incrementView(FIXTURE_ID, "page");

			const counters = await cache.readViewCounters(FIXTURE_ID);

			expect(counters.page).toBe(2);
			expect(counters.total).toBe(2);
		});
	});

	describe("deletion", () => {
		it("cascades view rows and clears the cache", async () => {
			const orphanId = "deleteMe123";
			await uploadRepository.insert({
				id: orphanId,
				extension: "png",
				mimeType: "image/png",
				sizeBytes: 1,
				checksumSha256: "a".repeat(64),
				width: null,
				height: null,
				hasThumbnail: false,
				createdAt: new Date(),
			});
			await uploadViewRepository.insert({ uploadId: orphanId, viewType: "download" });

			expect(await uploadRepository.deleteById(orphanId)).toBe(true);
			expect(await uploadRepository.findById(orphanId)).toBeNull();
			expect(await uploadViewRepository.countsFor(orphanId)).toEqual({
				page: 0,
				raw: 0,
				download: 0,
				total: 0,
			});
		});

		it("reports rows whose file vanished from disk", async () => {
			const ghostId = "ghostFile1";
			await uploadRepository.insert({
				id: ghostId,
				extension: "png",
				mimeType: "image/png",
				sizeBytes: 1,
				checksumSha256: "b".repeat(64),
				width: null,
				height: null,
				hasThumbnail: false,
				createdAt: new Date(),
			});

			const summary = await app.get(UploadReconcilerService).reconcile();

			expect(summary.orphans).toBe(1);
			expect(summary.imported).toBe(0);

			await uploadRepository.deleteById(ghostId);
		});
	});
});

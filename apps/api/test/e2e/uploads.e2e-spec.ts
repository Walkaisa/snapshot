import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { RuntimeConfigService } from "../../src/modules/runtime-config/runtime-config.service.js";
import { type ApiAgent, type ApiRequest, api, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const PNG = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	Buffer.from("a minimal but signature-valid png body used across the upload tests"),
]);

const REAL_PNG_1X1 = Buffer.from(
	"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001" +
		"0d0a2db40000000049454e44ae426082",
	"hex",
);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe("uploads (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let runtimeConfig: RuntimeConfigService;
	let apiKey: string;
	let agent: ApiAgent;
	let uploadId: string;
	let rawFilename: string;
	let uploadsDir = "";
	let previousUploadsDir: string | undefined;

	async function csrf(): Promise<string> {
		const response = await agent.get("/api/auth/csrf");
		return response.body.data.csrfToken as string;
	}

	beforeAll(async () => {
		previousUploadsDir = process.env.UPLOADS_DIR;
		uploadsDir = await mkdtemp(path.join(tmpdir(), "snapshot-uploads-"));
		process.env.UPLOADS_DIR = uploadsDir;

		await resetDatabase();
		await resetRedis();

		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(RELEASE_CHECKER)
			.useValue({ latestVersion: () => Promise.resolve(null) })
			.compile();

		app = moduleRef.createNestApplication({ bufferLogs: false });
		configureApp(app);
		await app.listen(0);
		server = app.getHttpServer();
		runtimeConfig = app.get(RuntimeConfigService);

		agent = apiAgent(server);
		const setupToken = await csrf();
		await agent
			.post("/api/auth/setup")
			.set("x-csrf-token", setupToken)
			.send({ username: "admin", password: "a-really-strong-password" });

		apiKey = (await agent.get("/api/api-key")).body.data.apiKey;
	});

	afterAll(async () => {
		await app.close();
		await rm(uploadsDir, { recursive: true, force: true });

		if (previousUploadsDir !== undefined) {
			process.env.UPLOADS_DIR = previousUploadsDir;
		}
	});

	function uploadPng(filename = "shot.png", body: Buffer = PNG): ApiRequest {
		return api(server)
			.post("/api/uploads")
			.set("Authorization", `Bearer ${apiKey}`)
			.attach("file", body, { filename, contentType: "image/png" });
	}

	describe("upload", () => {
		it("accepts a valid image with an api key", async () => {
			const response = await uploadPng();

			expect(response.status).toBe(201);
			expect(response.body.data.mimeType).toBe("image/png");
			expect(response.body.data.extension).toBe("png");
			expect(response.body.data.checksumSha256).toHaveLength(64);
			expect(response.body.data.sizeBytes).toBe(PNG.length);

			uploadId = response.body.data.id;
			rawFilename = `${uploadId}.png`;
			expect(response.body.data.rawUrl).toContain(`/raw/${rawFilename}`);
			expect(response.body.data.deleteUrl).toContain(`/api/uploads/${uploadId}`);
		});

		it("probes dimensions from a decodable image", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.attach("file", REAL_PNG_1X1, "pixel.png");

			expect(response.status).toBe(201);
			expect(response.body.data.width).toBe(1);
			expect(response.body.data.height).toBe(1);
		});

		it("stores null dimensions when the container cannot be probed", async () => {
			const response = await uploadPng();

			expect(response.status).toBe(201);
			expect(response.body.data.width).toBeNull();
			expect(response.body.data.height).toBeNull();
		});

		it("refuses an upload that carries neither a key nor a csrf token", async () => {
			const response = await api(server).post("/api/uploads").attach("file", PNG, { filename: "x.png", contentType: "image/png" });

			expect(response.status).toBe(403);
			expect(response.body.data.errorCode).toBe("forbidden");
		});

		it("rejects an upload with a wrong api key", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", "Bearer not-the-real-key")
				.attach("file", PNG, { filename: "x.png", contentType: "image/png" });

			expect(response.status).toBe(401);
		});

		it("rejects a disallowed extension", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.attach("file", Buffer.from("plain text"), {
					filename: "note.txt",
					contentType: "text/plain",
				});

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("invalid_file_type");
		});

		it("rejects content that does not match the extension", async () => {
			const response = await uploadPng("fake.png", Buffer.from("this is definitely not a png"));

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("invalid_content_type");
		});

		it("rejects an empty file", async () => {
			const response = await uploadPng("empty.png", Buffer.alloc(0));

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("file_empty");
		});

		it("rejects a file over the configured size limit", async () => {
			await runtimeConfig.update({ maxFileSizeBytes: 8 });

			try {
				const response = await uploadPng("big.png");
				expect(response.status).toBe(413);
				expect(response.body.data.errorCode).toBe("file_too_large");
			} finally {
				await runtimeConfig.update({ maxFileSizeBytes: 50 * 1024 * 1024 });
			}
		});

		it("throttles once the configured rate limit is exhausted", async () => {
			await runtimeConfig.update({ rateLimitEnabled: true, rateLimitRequests: 1, rateLimitWindowSeconds: 120 });

			try {
				expect((await uploadPng()).status).toBe(201);

				const response = await uploadPng();

				expect(response.status).toBe(429);
				expect(response.body.data.errorCode).toBe("rate_limit_exceeded");
				expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
			} finally {
				await runtimeConfig.update({ rateLimitEnabled: true, rateLimitRequests: 120, rateLimitWindowSeconds: 60 });
			}
		});

		it("accepts an upload from a dashboard session that carries its csrf token", async () => {
			const response = await agent
				.post("/api/uploads")
				.set("x-csrf-token", await csrf())
				.attach("file", PNG, { filename: "session.png", contentType: "image/png" });

			expect(response.status).toBe(201);
		});

		it("rejects a dashboard session upload without a csrf token", async () => {
			const response = await agent.post("/api/uploads").attach("file", PNG, { filename: "forged.png", contentType: "image/png" });

			expect(response.status).toBe(403);
			expect(response.body.data.errorCode).toBe("forbidden");
		});

		it("issues the requested slug when it is free", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.field("slug", "holiday-01")
				.attach("file", PNG, { filename: "shot.png", contentType: "image/png" });

			expect(response.status).toBe(201);
			expect(response.body.data.id).toBe("holiday-01");
			expect(response.body.data.rawUrl).toContain("/raw/holiday-01.png");
		});

		it("refuses a slug the namespace already issued", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.field("slug", "holiday-01")
				.attach("file", PNG, { filename: "shot.png", contentType: "image/png" });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("slug_unavailable");
		});

		it("refuses a slug that shadows a dashboard route", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.field("slug", "gallery")
				.attach("file", PNG, { filename: "shot.png", contentType: "image/png" });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("slug_unavailable");
		});

		it("refuses a slug the id shape cannot express", async () => {
			const response = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.field("slug", "no.dots")
				.attach("file", PNG, { filename: "shot.png", contentType: "image/png" });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("lets uploads through once the rate limit is switched off", async () => {
			await runtimeConfig.update({ rateLimitEnabled: false, rateLimitRequests: 1, rateLimitWindowSeconds: 120 });

			try {
				expect((await uploadPng()).status).toBe(201);
				expect((await uploadPng()).status).toBe(201);
			} finally {
				await runtimeConfig.update({ rateLimitEnabled: true, rateLimitRequests: 120, rateLimitWindowSeconds: 60 });
			}
		});
	});

	describe("raw serving", () => {
		it("streams the file with an immutable cache and etag", async () => {
			const response = await api(server).get(`/raw/${rawFilename}`);

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("image/png");
			expect(response.headers["cache-control"]).toContain("immutable");
			expect(response.headers.etag).toBeDefined();
			expect(Number(response.headers["content-length"])).toBe(PNG.length);
			expect(response.headers["accept-ranges"]).toBe("bytes");
		});

		it("answers a range request with 206 and just that slice", async () => {
			const response = await api(server).get(`/raw/${rawFilename}`).set("Range", "bytes=0-9");

			expect(response.status).toBe(206);
			expect(response.headers["content-range"]).toBe(`bytes 0-9/${PNG.length}`);
			expect(Number(response.headers["content-length"])).toBe(10);
			expect(response.body).toEqual(PNG.subarray(0, 10));
		});

		it("serves an open-ended range — the browser's opening video request", async () => {
			const response = await api(server).get(`/raw/${rawFilename}`).set("Range", "bytes=10-");

			expect(response.status).toBe(206);
			expect(response.headers["content-range"]).toBe(`bytes 10-${PNG.length - 1}/${PNG.length}`);
			expect(response.body).toEqual(PNG.subarray(10));
		});

		it("serves a suffix range", async () => {
			const response = await api(server).get(`/raw/${rawFilename}`).set("Range", "bytes=-5");

			expect(response.status).toBe(206);
			expect(response.body).toEqual(PNG.subarray(PNG.length - 5));
		});

		it("rejects a range past the end with 416", async () => {
			const response = await api(server).get(`/raw/${rawFilename}`).set("Range", `bytes=${PNG.length}-`);

			expect(response.status).toBe(416);
			expect(response.headers["content-range"]).toBe(`bytes */${PNG.length}`);
		});

		it("does not count a seek as a view", async () => {
			await delay(400);
			const before = await agent.get(`/api/uploads/${uploadId}/stats`);

			await api(server).get(`/raw/${rawFilename}`).set("Range", "bytes=5-9");
			await delay(400);

			const after = await agent.get(`/api/uploads/${uploadId}/stats`);

			expect(after.body.data.views.raw).toBe(before.body.data.views.raw);
		});

		it("returns 304 when the etag matches", async () => {
			const first = await api(server).get(`/raw/${rawFilename}`);
			const response = await api(server)
				.get(`/raw/${rawFilename}`)
				.set("If-None-Match", first.headers.etag ?? "");

			expect(response.status).toBe(304);
		});

		it("sets a download disposition when requested", async () => {
			const response = await api(server).get(`/raw/${rawFilename}?download=1`);

			expect(response.status).toBe(200);
			expect(response.headers["content-disposition"]).toContain("attachment");
		});

		it("404s for a missing file", async () => {
			const response = await api(server).get("/raw/doesNotExist.png");

			expect(response.status).toBe(404);
		});
	});

	describe("metadata and listing", () => {
		it("exposes public metadata without a delete url", async () => {
			const response = await api(server).get(`/api/uploads/${uploadId}`);

			expect(response.status).toBe(200);
			expect(response.body.data.downloadUrl).toContain("download=1");
			expect(response.body.data).not.toHaveProperty("deleteUrl");
		});

		it("renders the embed from the live config so the share page needs no session", async () => {
			const response = await api(server).get(`/api/uploads/${uploadId}`);

			expect(response.status).toBe(200);
			expect(response.body.data.embed).toMatchObject({
				enabled: true,
				providerName: "Snapshot",
				themeColor: "#5865F2",
				title: `${uploadId}.png`,
			});
			expect(response.body.data.embed).not.toHaveProperty("apiKey");
		});

		it("lists uploads for a session", async () => {
			const response = await agent.get("/api/uploads");

			expect(response.status).toBe(200);
			expect(response.body.data.total).toBeGreaterThanOrEqual(1);
			expect(response.body.data.items.some((item: { id: string }) => item.id === uploadId)).toBe(true);
		});

		it("lists uploads for an api key client", async () => {
			const response = await api(server).get("/api/uploads").set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(200);
		});

		it("reports per-upload view counts", async () => {
			await delay(400);
			const response = await agent.get(`/api/uploads/${uploadId}/stats`);

			expect(response.status).toBe(200);
			expect(response.body.data.views.raw).toBeGreaterThanOrEqual(1);
			expect(response.body.data.views.download).toBeGreaterThanOrEqual(1);
			expect(response.body.data.views.page).toBeGreaterThanOrEqual(1);
		});
	});

	describe("stats overview", () => {
		it("aggregates uploads, views, sessions and version", async () => {
			const response = await agent.get("/api/stats/overview");

			expect(response.status).toBe(200);
			expect(response.body.data.uploads.count).toBeGreaterThanOrEqual(1);
			expect(response.body.data.sessions.active).toBeGreaterThanOrEqual(1);
			expect(response.body.data.version.current).toBeTypeOf("string");
		});

		it("updates a cached overview atomically when a view is tracked", async () => {
			const before = await agent.get("/api/stats/overview");
			await api(server).get(`/raw/${rawFilename}`);
			await delay(400);
			const after = await agent.get("/api/stats/overview");

			expect(after.body.data.views.raw).toBe(before.body.data.views.raw + 1);
			expect(after.body.data.views.total).toBe(before.body.data.views.total + 1);
		});
	});

	describe("sharex and api key", () => {
		it("serves a downloadable sharex config", async () => {
			const response = await agent.get("/api/sharex");

			expect(response.status).toBe(200);
			expect(response.headers["content-disposition"]).toContain("snapshot.sxcu");

			const payload = JSON.parse(response.text);
			expect(payload.RequestURL).toContain("/api/uploads");
			expect(payload.Headers.Authorization).toContain("Bearer ");
		});

		it("rotates the api key and invalidates the old one", async () => {
			const token = await csrf();
			const response = await agent.post("/api/api-key/rotate").set("x-csrf-token", token);

			expect(response.status).toBe(200);
			expect(response.body.data.apiKey).not.toBe(apiKey);

			const rejected = await uploadPng();
			expect(rejected.status).toBe(401);

			apiKey = response.body.data.apiKey;
		});
	});

	describe("deletion", () => {
		it("deletes with an api key and then 404s the raw file", async () => {
			const response = await api(server).delete(`/api/uploads/${uploadId}`).set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(200);
			expect(response.body.data.id).toBe(uploadId);

			const raw = await api(server).get(`/raw/${rawFilename}`);
			expect(raw.status).toBe(404);
		});
	});
});

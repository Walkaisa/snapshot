import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { api } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

describe("API (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		await resetDatabase();
		await resetRedis();

		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(RELEASE_CHECKER)
			.useValue({ latestVersion: () => Promise.resolve("9.9.9") })
			.compile();

		app = moduleRef.createNestApplication({ bufferLogs: false });
		configureApp(app);
		await app.listen(0);
	});

	afterAll(async () => {
		await app.close();
	});

	it("GET /api/healthz returns a raw ok body", async () => {
		const response = await api(app.getHttpServer()).get("/api/healthz");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
		expect(response.headers["x-request-id"]).toBeDefined();
	});

	it("GET /api/meta returns the enveloped project metadata", async () => {
		const response = await api(app.getHttpServer()).get("/api/meta");

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.message).toBe("Snapshot is running");
		expect(response.body.data).toMatchObject({
			name: "Snapshot",
			author: "Walkaisa",
			version: { current: "development", latest: null, updateAvailable: false },
		});
	});

	it("reuses a valid X-Request-ID header", async () => {
		const response = await api(app.getHttpServer()).get("/api/meta").set("X-Request-ID", "req-test-1");

		expect(response.headers["x-request-id"]).toBe("req-test-1");
	});

	it("returns the error envelope for an unknown route", async () => {
		const response = await api(app.getHttpServer()).get("/api/does-not-exist");

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
		expect(response.body.data.errorCode).toBe("not_found");
		expect(response.body.data.requestId).toBeDefined();
	});
});

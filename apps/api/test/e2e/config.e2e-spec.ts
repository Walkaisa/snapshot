import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { type ApiAgent, api, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

describe("config api (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let agent: ApiAgent;

	async function csrf(): Promise<string> {
		const response = await agent.get("/api/auth/csrf");
		return response.body.data.csrfToken as string;
	}

	beforeAll(async () => {
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

		agent = apiAgent(server);
		const token = await csrf();
		await agent.post("/api/auth/setup").set("x-csrf-token", token).send({ username: "admin", password: "a-really-strong-password" });
	});

	afterAll(async () => {
		await app.close();
	});

	describe("read", () => {
		it("returns the config with a masked api key", async () => {
			const response = await agent.get("/api/config");

			expect(response.status).toBe(200);
			expect(response.body.data.embedProviderName).toBe("Snapshot");
			expect(response.body.data.apiKey.startsWith("••••••••")).toBe(true);
			expect(response.body.data.apiKey.length).toBeLessThan(32);
		});

		it("requires a session", async () => {
			const response = await api(server).get("/api/config");

			expect(response.status).toBe(401);
		});
	});

	describe("update", () => {
		it("applies a valid partial update and persists it", async () => {
			const token = await csrf();
			const response = await agent
				.patch("/api/config")
				.set("x-csrf-token", token)
				.send({ embedProviderName: "Acme", rateLimitRequests: 200 });

			expect(response.status).toBe(200);
			expect(response.body.data.embedProviderName).toBe("Acme");
			expect(response.body.data.rateLimitRequests).toBe(200);
			expect(response.body.data.apiKey.startsWith("••••••••")).toBe(true);

			const reread = await agent.get("/api/config");
			expect(reread.body.data.embedProviderName).toBe("Acme");
		});

		it("rejects a mutation without a csrf token", async () => {
			const response = await agent.patch("/api/config").send({ embedProviderName: "NoCsrf" });

			expect(response.status).toBe(403);
		});

		it("rejects an invalid value with a validation error", async () => {
			const token = await csrf();
			const response = await agent.patch("/api/config").set("x-csrf-token", token).send({ embedThemeColor: "notacolor" });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("rejects an allow-list entry that is not a media type", async () => {
			const token = await csrf();
			const response = await agent.patch("/api/config").set("x-csrf-token", token).send({ allowedExtensions: ".png,.txt" });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("rejects an unknown field", async () => {
			const token = await csrf();
			const response = await agent.patch("/api/config").set("x-csrf-token", token).send({ doesNotExist: true });

			expect(response.status).toBe(400);
		});

		it("rejects an attempt to change the api key through config", async () => {
			const token = await csrf();
			const response = await agent
				.patch("/api/config")
				.set("x-csrf-token", token)
				.send({ apiKey: "k".repeat(48) });

			expect(response.status).toBe(400);
		});
	});
});

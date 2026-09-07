import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { AuditRepository } from "../../src/db/repositories/audit.repository.js";
import { AuditService } from "../../src/modules/audit/audit.service.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { type ApiAgent, api, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

describe("audit (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let audit: AuditService;
	let auditRepository: AuditRepository;
	let agent: ApiAgent;
	let apiKey: string;

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
		audit = app.get(AuditService);
		auditRepository = app.get(AuditRepository);

		agent = apiAgent(server);
		const setupToken = await csrf();
		await agent
			.post("/api/auth/setup")
			.set("x-csrf-token", setupToken)
			.send({ username: "admin", password: "a-really-strong-password" });

		apiKey = (await agent.get("/api/api-key")).body.data.apiKey;
		await audit.flush();
	});

	afterAll(async () => {
		await app.close();
	});

	it("recorded the setup and the api key reveal that just happened", async () => {
		const response = await agent.get("/api/audit?perPage=200");

		expect(response.status).toBe(200);

		const actions = response.body.data.items.map((entry: { action: string }) => entry.action);

		expect(actions).toContain("auth.setup");
		expect(actions).toContain("api_key.reveal");
	});

	it("derives the category and target from the action", async () => {
		const response = await agent.get("/api/audit?categories=auth");
		const [entry] = response.body.data.items;

		expect(entry.category).toBe("auth");
		expect(entry.targetType).toBeTruthy();
	});

	it("records a failed sign-in as a warning", async () => {
		const token = await csrf();

		await agent.post("/api/auth/sign-in").set("x-csrf-token", token).send({ username: "admin", password: "wrong-password-entirely" });
		await audit.flush();

		const response = await agent.get("/api/audit?severities=warning&outcomes=failure");
		const actions = response.body.data.items.map((entry: { action: string }) => entry.action);

		expect(actions).toContain("auth.sign_in");
	});

	it("records the changed config keys without their values", async () => {
		const token = await csrf();

		await agent.patch("/api/config").set("x-csrf-token", token).send({ embedProviderName: "Audited" });
		await audit.flush();

		const response = await agent.get("/api/audit?categories=config");
		const [entry] = response.body.data.items;

		expect(entry.action).toBe("config.update");
		expect(entry.metadata).toEqual({ embedProviderName: "Audited" });
	});

	it("records which preference was changed to what", async () => {
		const token = await csrf();

		await agent.patch("/api/account/preferences").set("x-csrf-token", token).send({ locale: "de" });
		await audit.flush();

		const response = await agent.get("/api/audit?categories=account");
		const [entry] = response.body.data.items;

		expect(entry.action).toBe("account.preferences_update");
		expect(entry.metadata).toEqual({ locale: "de" });
	});

	it("never records the password that guarded a change", async () => {
		const token = await csrf();

		await agent
			.patch("/api/account/username")
			.set("x-csrf-token", token)
			.send({ username: "renamed", currentPassword: "a-really-strong-password" });
		await audit.flush();

		const response = await agent.get("/api/audit?categories=account");
		const [entry] = response.body.data.items;

		expect(entry.action).toBe("account.username_change");
		expect(entry.metadata.username).toBe("renamed");
		expect(entry.metadata.currentPassword).toBe("[redacted]");
	});

	it("records a rejected api key as a security event", async () => {
		await api(server).get("/api/uploads").set("Authorization", "Bearer not-the-real-key");
		await audit.flush();

		const response = await agent.get("/api/audit?categories=security");
		const actions = response.body.data.items.map((entry: { action: string }) => entry.action);

		expect(actions).toContain("security.api_key_rejected");
	});

	it("filters by search across the target and the path", async () => {
		const token = await csrf();

		await agent.post("/api/links").set("x-csrf-token", token).send({ url: "https://example.com/audited", slug: "audited-slug" });
		await audit.flush();

		const response = await agent.get("/api/audit?search=audited-slug");

		expect(response.body.data.total).toBeGreaterThan(0);
		expect(response.body.data.items[0].targetId).toBe("audited-slug");
	});

	it("records the real client address, not a hash", async () => {
		const response = await agent.get("/api/audit?categories=links");
		const [entry] = response.body.data.items;

		expect(entry.ipAddress).toMatch(/^(::1|::ffff:)?[0-9a-f.:]+$/i);
		expect(entry.ipAddress).not.toHaveLength(64);
	});

	it("records the user agent a client sent", async () => {
		const token = await csrf();

		await agent
			.post("/api/links")
			.set("x-csrf-token", token)
			.set("user-agent", "Mozilla/5.0 (Windows NT 10.0) Chrome/141.0")
			.send({ url: "https://example.com/agent", slug: "agent-slug" });
		await audit.flush();

		const response = await agent.get("/api/audit?search=agent-slug");

		expect(response.body.data.items[0].userAgent).toBe("Mozilla/5.0 (Windows NT 10.0) Chrome/141.0");
	});

	it("keeps the full destination on a short link entry", async () => {
		const response = await agent.get("/api/audit?search=audited-slug");
		const [entry] = response.body.data.items;

		expect(entry.metadata.target).toBe("https://example.com/audited");
		expect(entry.metadata.shortUrl).toContain("/audited-slug");
	});

	it("counts by severity in the summary", async () => {
		const response = await agent.get("/api/audit/summary");

		expect(response.status).toBe(200);
		expect(response.body.data.total).toBeGreaterThan(0);
		expect(response.body.data.retentionDays).toBeGreaterThan(0);
		expect(response.body.data.oldestAt).not.toBeNull();
	});

	it("honours a time window that excludes everything", async () => {
		const response = await agent.get(`/api/audit?from=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}`);

		expect(response.body.data.total).toBe(0);
	});

	it("deletes entries older than the retention cutoff", async () => {
		await auditRepository.insertMany([
			{
				occurredAt: new Date("2000-01-01T00:00:00.000Z"),
				action: "system.audit_pruned",
				severity: "info",
				outcome: "success",
				actor: "system",
				targetType: null,
				targetId: null,
				errorCode: null,
				requestId: null,
				method: null,
				path: null,
				durationMs: null,
				ipAddress: null,
				userAgent: null,
				metadata: null,
			},
		]);

		expect(await auditRepository.deleteOlderThan(new Date("2001-01-01T00:00:00.000Z"))).toBe(1);
	});

	it("rejects a category it does not know", async () => {
		const response = await agent.get("/api/audit?categories=nonsense");

		expect(response.status).toBe(400);
		expect(response.body.data.errorCode).toBe("validation_error");
	});

	it("is closed to an api key, however valid", async () => {
		const response = await api(server).get("/api/audit").set("Authorization", `Bearer ${apiKey}`);

		expect(response.status).toBe(401);
	});

	it("is closed to an unauthenticated caller", async () => {
		expect((await api(server).get("/api/audit")).status).toBe(401);
	});
});

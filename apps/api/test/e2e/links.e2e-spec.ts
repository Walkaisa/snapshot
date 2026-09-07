import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Link } from "@snapshot/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { RuntimeConfigService } from "../../src/modules/runtime-config/runtime-config.service.js";
import { type ApiAgent, api, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const PNG = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	Buffer.from("a minimal but signature-valid png body used across the link tests"),
]);

const TARGET = "https://example.com/a/very/long/destination";

describe("links (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let runtimeConfig: RuntimeConfigService;
	let apiKey: string;
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
	});

	function createLink(body: Record<string, unknown>) {
		return api(server).post("/api/links").set("Authorization", `Bearer ${apiKey}`).send(body);
	}

	describe("create", () => {
		it("mints a slug from the configured shape when none is given", async () => {
			await runtimeConfig.update({
				linkIdLength: 9,
				linkIdAlphabet: { mode: "custom", characters: "abcdefgh" },
				linkIdMinDigits: 0,
				linkIdMinSymbols: 0,
			});

			const response = await createLink({ url: TARGET });

			expect(response.status).toBe(201);
			expect(response.body.data.slug).toMatch(/^[a-h]{9}$/);
			expect(response.body.data.targetUrl).toBe(TARGET);
			expect(response.body.data.visits).toBe(0);
			expect(response.body.data.shortUrl).toBe(`http://localhost:3000/${response.body.data.slug}`);

			await runtimeConfig.update({
				linkIdLength: 10,
				linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "digits"] },
				linkIdMinDigits: 2,
				linkIdMinSymbols: 2,
			});
		});

		it("takes a custom slug", async () => {
			const response = await createLink({ url: TARGET, slug: "launch" });

			expect(response.status).toBe(201);
			expect(response.body.data.slug).toBe("launch");
		});

		it("rejects a slug that is already taken by a link", async () => {
			const response = await createLink({ url: TARGET, slug: "launch" });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("slug_unavailable");
		});

		it("rejects a slug that would shadow a dashboard route", async () => {
			const response = await createLink({ url: TARGET, slug: "overview" });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("slug_unavailable");
		});

		it("rejects a slug that is already taken by an upload", async () => {
			const upload = await api(server)
				.post("/api/uploads")
				.set("Authorization", `Bearer ${apiKey}`)
				.attach("file", PNG, { filename: "shot.png", contentType: "image/png" });

			const response = await createLink({ url: TARGET, slug: upload.body.data.id });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("slug_unavailable");
		});

		it.each(["not-a-url", "javascript:alert(1)", "ftp://example.com/x"])("rejects %j as a destination", async (url) => {
			const response = await createLink({ url });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it.each(["has space", "has.dot", "-lead", "trail-"])("rejects %j as a slug", async (slug) => {
			const response = await createLink({ url: TARGET, slug });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("rejects unknown fields", async () => {
			const response = await createLink({ url: TARGET, visits: 99 });

			expect(response.status).toBe(400);
		});

		it("rejects a wrong api key with a credential error, not a csrf one", async () => {
			const response = await api(server).post("/api/links").set("Authorization", "Bearer not-the-key").send({ url: TARGET });

			expect(response.status).toBe(401);
			expect(response.body.data.errorCode).toBe("unauthorized");
		});

		it("rejects a request carrying neither a key nor a csrf token", async () => {
			const response = await api(server).post("/api/links").send({ url: TARGET });

			expect(response.status).toBe(403);
		});

		it("accepts a dashboard session with a csrf token", async () => {
			const response = await agent
				.post("/api/links")
				.set("x-csrf-token", await csrf())
				.send({ url: TARGET, slug: "from-dashboard" });

			expect(response.status).toBe(201);
		});

		it("rejects a dashboard session without a csrf token", async () => {
			const response = await agent.post("/api/links").send({ url: TARGET, slug: "no-csrf" });

			expect(response.status).toBe(403);
		});
	});

	describe("resolve", () => {
		it("returns the link branch and counts the visit", async () => {
			const response = await api(server).get("/api/resolve/launch");

			expect(response.status).toBe(200);
			expect(response.body.data.kind).toBe("link");
			expect(response.body.data.link).toEqual({ slug: "launch", targetUrl: TARGET });

			await expect
				.poll(async () => (await api(server).get("/api/links/launch").set("Authorization", `Bearer ${apiKey}`)).body.data.visits)
				.toBeGreaterThan(0);
		});

		it("404s an id nothing is shared under", async () => {
			const response = await api(server).get("/api/resolve/definitely-unused");

			expect(response.status).toBe(404);
			expect(response.body.data.errorCode).toBe("not_found");
		});

		it("404s a syntactically impossible id without touching the database", async () => {
			const response = await api(server).get("/api/resolve/way.too.dotted");

			expect(response.status).toBe(404);
		});
	});

	describe("list", () => {
		function list(query: string) {
			return api(server).get(`/api/links?${query}`).set("Authorization", `Bearer ${apiKey}`);
		}

		it("returns the newest links first, paginated", async () => {
			const response = await list("page=1&perPage=2");

			expect(response.status).toBe(200);
			expect(response.body.data.items).toHaveLength(2);
			expect(response.body.data.perPage).toBe(2);
			expect(response.body.data.total).toBeGreaterThanOrEqual(3);
		});

		it("sorts by slug in both directions", async () => {
			const ascending = (await list("sort=slug&order=asc&perPage=100")).body.data.items.map((item: Link) => item.slug);
			const descending = (await list("sort=slug&order=desc&perPage=100")).body.data.items.map((item: Link) => item.slug);

			expect(ascending).toEqual([...ascending].sort());
			expect(descending).toEqual([...ascending].reverse());
		});

		it("sorts by the visit count, which lives in another table", async () => {
			const response = await list("sort=visits&order=desc&perPage=100");
			const visits = response.body.data.items.map((item: Link) => item.visits);

			expect(response.status).toBe(200);
			expect(visits).toEqual([...visits].sort((a: number, b: number) => b - a));
		});

		it("filters by slug or destination and narrows the total with it", async () => {
			const all = (await list("perPage=100")).body.data.total;
			const bySlug = await list("search=from-dashboard");

			expect(bySlug.body.data.items).toHaveLength(1);
			expect(bySlug.body.data.total).toBe(1);
			expect(bySlug.body.data.total).toBeLessThan(all);

			const byTarget = await list("search=very/long/destination");
			expect(byTarget.body.data.items.length).toBeGreaterThanOrEqual(1);
		});

		it("treats wildcard characters in the search as literal text", async () => {
			expect((await list("search=%25")).body.data.total).toBe(0);
			expect((await list("search=_")).body.data.total).toBe(0);
		});

		it("rejects a column it cannot sort by", async () => {
			expect((await list("sort=deleteUrl")).status).toBe(400);
		});

		it("requires authentication", async () => {
			expect((await api(server).get("/api/links")).status).toBe(401);
		});
	});

	describe("id availability", () => {
		it("reports a free id", async () => {
			const response = await api(server).get("/api/ids/definitely-unused").set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual({ id: "definitely-unused", available: true, occupiedBy: null });
		});

		it("names what already holds an id", async () => {
			const link = await api(server).get("/api/ids/from-dashboard").set("Authorization", `Bearer ${apiKey}`);
			const reserved = await api(server).get("/api/ids/overview").set("Authorization", `Bearer ${apiKey}`);

			expect(link.body.data).toEqual({ id: "from-dashboard", available: false, occupiedBy: "link" });
			expect(reserved.body.data).toEqual({ id: "overview", available: false, occupiedBy: "reserved" });
		});

		it("rejects something that could never be an id", async () => {
			const response = await api(server).get("/api/ids/not.an.id").set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(400);
		});

		it("requires authentication so it cannot be used to enumerate ids", async () => {
			expect((await api(server).get("/api/ids/definitely-unused")).status).toBe(401);
		});
	});

	describe("update", () => {
		it("changes the destination and re-resolves to it", async () => {
			const next = "https://example.com/somewhere/else";
			const response = await api(server).patch("/api/links/launch").set("Authorization", `Bearer ${apiKey}`).send({ url: next });

			expect(response.status).toBe(200);
			expect(response.body.data.targetUrl).toBe(next);

			const resolved = await api(server).get("/api/resolve/launch");
			expect(resolved.body.data.link.targetUrl).toBe(next);
		});

		it("404s an unknown slug", async () => {
			const response = await api(server).patch("/api/links/nope-nope").set("Authorization", `Bearer ${apiKey}`).send({ url: TARGET });

			expect(response.status).toBe(404);
			expect(response.body.data.errorCode).toBe("link_not_found");
		});
	});

	describe("delete", () => {
		it("removes the link and frees its slug", async () => {
			const response = await api(server).delete("/api/links/launch").set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(200);
			expect(response.body.data.slug).toBe("launch");
			expect((await api(server).get("/api/resolve/launch")).status).toBe(404);
			expect((await createLink({ url: TARGET, slug: "launch" })).status).toBe(201);
		});

		it("404s an unknown slug", async () => {
			const response = await api(server).delete("/api/links/nope-nope").set("Authorization", `Bearer ${apiKey}`);

			expect(response.status).toBe(404);
		});
	});
});

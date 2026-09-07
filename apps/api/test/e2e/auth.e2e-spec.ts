import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { type ApiAgent, api, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const USERNAME = "admin";
const PASSWORD = "initial-strong-password";
const NEW_PASSWORD = "rotated-strong-password";

async function csrfToken(agent: ApiAgent): Promise<string> {
	const response = await agent.get("/api/auth/csrf");
	return response.body.data.csrfToken as string;
}

async function loginWith(agent: ApiAgent, password: string): Promise<void> {
	const token = await csrfToken(agent);
	await agent.post("/api/auth/sign-in").set("x-csrf-token", token).send({ username: USERNAME, password });
}

describe("auth (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;

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
	});

	afterAll(async () => {
		await app.close();
	});

	describe("setup gate", () => {
		it("reports an uninitialised, unauthenticated state", async () => {
			const response = await api(server).get("/api/auth/state");

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual({ initialized: false, authenticated: false });
		});

		it("creates the first admin and starts a session", async () => {
			const agents = [apiAgent(server), apiAgent(server)];
			const tokens = await Promise.all(agents.map((agent) => csrfToken(agent)));
			const responses = await Promise.all(
				agents.map((agent, index) =>
					agent
						.post("/api/auth/setup")
						.set("x-csrf-token", tokens[index] ?? "")
						.send({ username: USERNAME, password: PASSWORD }),
				),
			);
			const statuses = responses.map(({ status }) => status).sort();
			const createdIndex = responses.findIndex(({ status }) => status === 201);
			const response = responses[createdIndex];
			const agent = agents[createdIndex];

			expect(statuses).toEqual([201, 409]);
			expect(response).toBeDefined();
			expect(agent).toBeDefined();

			if (response === undefined || agent === undefined) {
				throw new Error("Concurrent setup did not produce one initialized session");
			}

			expect(response.body.data.username).toBe(USERNAME);
			expect(response.body.data.csrfToken).toBeTypeOf("string");

			const rawCookies = response.headers["set-cookie"];
			const cookie = Array.isArray(rawCookies) ? rawCookies.join(";") : (rawCookies ?? "");
			expect(cookie).toContain("snapshot.sid=");
			expect(cookie).toContain("HttpOnly");
			expect(cookie).toContain("SameSite=Strict");

			const state = await agent.get("/api/auth/state");
			expect(state.body.data).toEqual({ initialized: true, authenticated: true });
		});

		it("rejects a second setup with a conflict", async () => {
			const agent = apiAgent(server);
			const token = await csrfToken(agent);

			const response = await agent
				.post("/api/auth/setup")
				.set("x-csrf-token", token)
				.send({ username: "intruder", password: "another-strong-password" });

			expect(response.status).toBe(409);
			expect(response.body.data.errorCode).toBe("conflict");
		});
	});

	describe("csrf protection", () => {
		it("rejects an authenticated mutation that omits the token", async () => {
			const agent = apiAgent(server);
			await loginWith(agent, PASSWORD);

			const response = await agent.post("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

			expect(response.status).toBe(403);
			expect(response.body.data.errorCode).toBe("forbidden");
		});

		it("rejects a mutation carrying a bogus token", async () => {
			const agent = apiAgent(server);
			await loginWith(agent, PASSWORD);

			const response = await agent
				.post("/api/auth/change-password")
				.set("x-csrf-token", "not-the-real-token")
				.send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

			expect(response.status).toBe(403);
		});
	});

	describe("login", () => {
		it("validates the credential body before Passport reads it", async () => {
			const agent = apiAgent(server);
			const token = await csrfToken(agent);
			const response = await agent
				.post("/api/auth/sign-in")
				.set("x-csrf-token", token)
				.send({ username: { nested: true }, password: "wrong-password" });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("rejects invalid credentials generically", async () => {
			const agent = apiAgent(server);
			const token = await csrfToken(agent);

			const response = await agent
				.post("/api/auth/sign-in")
				.set("x-csrf-token", token)
				.send({ username: USERNAME, password: "wrong-password" });

			expect(response.status).toBe(401);
			expect(response.body.data.errorCode).toBe("unauthorized");
		});

		it("signs in with correct credentials", async () => {
			const agent = apiAgent(server);
			const token = await csrfToken(agent);

			const response = await agent
				.post("/api/auth/sign-in")
				.set("x-csrf-token", token)
				.send({ username: USERNAME, password: PASSWORD });

			expect(response.status).toBe(200);
			expect(response.body.data.username).toBe(USERNAME);

			const session = await agent.get("/api/auth/session");
			expect(session.status).toBe(200);
			expect(session.body.data.username).toBe(USERNAME);
		});

		it("refuses access to a protected route without a session", async () => {
			const response = await api(server).get("/api/auth/session");

			expect(response.status).toBe(401);
		});
	});

	describe("session management", () => {
		it("lists sessions, revokes others on password change, and logs out", async () => {
			const keeper = apiAgent(server);
			await loginWith(keeper, PASSWORD);

			const doomed = apiAgent(server);
			await loginWith(doomed, PASSWORD);

			const list = await keeper.get("/api/auth/sessions");
			expect(list.status).toBe(200);
			expect(list.body.data.sessions.length).toBeGreaterThanOrEqual(2);
			expect(list.body.data.sessions.some((s: { current: boolean }) => s.current)).toBe(true);

			const changeToken = await csrfToken(keeper);
			const changed = await keeper
				.post("/api/auth/change-password")
				.set("x-csrf-token", changeToken)
				.send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
			expect(changed.status).toBe(200);

			const doomedSession = await doomed.get("/api/auth/session");
			expect(doomedSession.status).toBe(401);

			const keeperSession = await keeper.get("/api/auth/session");
			expect(keeperSession.status).toBe(200);

			const logoutToken = await csrfToken(keeper);
			const loggedOut = await keeper.post("/api/auth/sign-out").set("x-csrf-token", logoutToken);
			expect(loggedOut.status).toBe(200);

			const afterLogout = await keeper.get("/api/auth/session");
			expect(afterLogout.status).toBe(401);
		});
	});

	describe("brute-force throttling", () => {
		it("locks out after too many attempts", async () => {
			await resetRedis();
			const agent = apiAgent(server);
			const token = await csrfToken(agent);

			let sawTooMany = false;

			for (let attempt = 0; attempt < 15; attempt += 1) {
				const response = await agent
					.post("/api/auth/sign-in")
					.set("x-csrf-token", token)
					.send({ username: USERNAME, password: "still-wrong" });

				if (response.status === 429) {
					expect(response.body.data.errorCode).toBe("rate_limit_exceeded");
					sawTooMany = true;
					break;
				}
			}

			expect(sawTooMany).toBe(true);
		});
	});
});

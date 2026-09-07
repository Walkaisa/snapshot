import { setTimeout as delay } from "node:timers/promises";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TOTP_PERIOD_SECONDS } from "@snapshot/contracts";
import { Secret, TOTP } from "otpauth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { type ApiAgent, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const USERNAME = "admin";
const PASSWORD = "a-strong-enough-password";
const LABEL = "Bitwarden";
const PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;
const SPENT_CODE_TIMEOUT_MS = 60_000;

function codeFor(secret: string, timestamp = Date.now()): string {
	return new TOTP({
		issuer: "Snapshot",
		label: USERNAME,
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: Secret.fromBase32(secret),
	}).generate({
		timestamp,
	});
}

function counterAt(timestamp: number): number {
	return Math.floor(timestamp / PERIOD_MS);
}

describe("mfa (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let agent: ApiAgent;
	let recoveryClient: ApiAgent;
	let secret: string;
	let recoveryCodes: string[];
	const spentCounters = new Set<number>();

	async function unspentCode(): Promise<string> {
		for (;;) {
			const now = Date.now();
			const current = counterAt(now);
			const counter = [current, current + 1].find((candidate) => !spentCounters.has(candidate));

			if (counter !== undefined) {
				spentCounters.add(counter);

				return codeFor(secret, counter * PERIOD_MS);
			}

			await delay((current + 1) * PERIOD_MS - now + 100);
		}
	}

	async function csrf(client: ApiAgent): Promise<string> {
		return (await client.get("/api/auth/csrf")).body.data.csrfToken as string;
	}

	async function post(client: ApiAgent, path: string, body: object = {}) {
		const csrfToken = await csrf(client);

		return client.post(path).set("x-csrf-token", csrfToken).send(body);
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
		const setupResponse = await post(agent, "/api/auth/setup", { username: USERNAME, password: PASSWORD });
		expect(setupResponse.status, JSON.stringify(setupResponse.body)).toBe(201);
	});

	afterAll(async () => {
		await app.close();
	});

	describe("enrolment", () => {
		it("starts out disabled", async () => {
			const response = await agent.get("/api/auth/mfa");

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({ enabled: false, pendingEnrollment: false, recoveryCodesRemaining: 0 });
		});

		it("refuses to hand out a secret without the current password", async () => {
			const response = await post(agent, "/api/auth/mfa/setup", { currentPassword: "not-the-password" });

			expect(response.status).toBe(401);
		});

		it("issues a secret and an otpauth uri once the password checks out", async () => {
			const response = await post(agent, "/api/auth/mfa/setup", { currentPassword: PASSWORD });

			expect(response.status).toBe(200);
			expect(response.body.data.secret).toMatch(/^[A-Z2-7]{32}$/);
			expect(response.body.data.otpauthUri).toContain(`secret=${response.body.data.secret}`);
			expect(response.body.data.account).toBe(USERNAME);

			secret = response.body.data.secret;
		});

		it("is pending, not enabled, until a code confirms it", async () => {
			const response = await agent.get("/api/auth/mfa");

			expect(response.body.data).toMatchObject({ enabled: false, pendingEnrollment: true });
		});

		it("rejects an enable without a name", async () => {
			const response = await post(agent, "/api/auth/mfa/enable", { code: codeFor(secret), label: "  " });

			expect(response.status).toBe(400);
		});

		it("rejects a wrong confirmation code", async () => {
			const response = await post(agent, "/api/auth/mfa/enable", { code: "000000", label: LABEL });

			expect(response.status).toBe(401);
		});

		it("enables on a valid code and returns the recovery codes once", async () => {
			const olderSession = apiAgent(server);
			await post(olderSession, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });
			const response = await post(agent, "/api/auth/mfa/enable", { code: await unspentCode(), label: LABEL });

			expect(response.status).toBe(200);
			expect(response.body.data.codes).toHaveLength(10);

			recoveryCodes = response.body.data.codes;

			const status = await agent.get("/api/auth/mfa");
			expect(status.body.data).toMatchObject({ enabled: true, pendingEnrollment: false, label: LABEL, recoveryCodesRemaining: 10 });
			expect(status.body.data.enabledAt).not.toBeNull();
			expect((await olderSession.get("/api/auth/session")).status).toBe(401);
		});

		it("never returns the secret again", async () => {
			const response = await agent.get("/api/auth/mfa");

			expect(JSON.stringify(response.body)).not.toContain(secret);
		});
	});

	describe("sign-in challenge", () => {
		it("stops at the challenge instead of establishing a session", async () => {
			const client = apiAgent(server);
			const response = await post(client, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({ mfaRequired: true });
			expect(response.body.data.csrfToken).toBeTruthy();

			const state = await client.get("/api/auth/state");
			expect(state.body.data.authenticated).toBe(false);

			const session = await client.get("/api/auth/session");
			expect(session.status).toBe(401);
		});

		it("rejects a wrong code and keeps the caller signed out", async () => {
			const client = apiAgent(server);
			await post(client, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

			const response = await post(client, "/api/auth/sign-in/mfa", { code: "000000" });

			expect(response.status).toBe(401);
			expect((await client.get("/api/auth/state")).body.data.authenticated).toBe(false);
		});

		it("refuses a code without a pending challenge", async () => {
			const client = apiAgent(server);

			const response = await post(client, "/api/auth/sign-in/mfa", { code: codeFor(secret) });

			expect(response.status).toBe(401);
		});

		it(
			"signs in on a valid code",
			async () => {
				const client = apiAgent(server);
				await post(client, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

				const response = await post(client, "/api/auth/sign-in/mfa", { code: await unspentCode() });

				expect(response.status).toBe(200);
				expect(response.body.data.username).toBe(USERNAME);
				expect((await client.get("/api/auth/state")).body.data.authenticated).toBe(true);
			},
			SPENT_CODE_TIMEOUT_MS,
		);

		it(
			"refuses to replay a code that already signed someone in",
			async () => {
				const code = await unspentCode();
				const first = apiAgent(server);
				await post(first, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

				expect((await post(first, "/api/auth/sign-in/mfa", { code })).status).toBe(200);

				const second = apiAgent(server);
				await post(second, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });
				const response = await post(second, "/api/auth/sign-in/mfa", { code });

				expect(response.status).toBe(401);
			},
			SPENT_CODE_TIMEOUT_MS,
		);

		it("accepts a recovery code once and then burns it", async () => {
			const [code] = recoveryCodes;
			const client = apiAgent(server);
			await post(client, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

			expect((await post(client, "/api/auth/sign-in/mfa", { code })).status).toBe(200);
			expect((await agent.get("/api/auth/mfa")).body.data.recoveryCodesRemaining).toBe(9);

			const reuse = apiAgent(server);
			await post(reuse, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

			expect((await post(reuse, "/api/auth/sign-in/mfa", { code })).status).toBe(401);
		});
	});

	describe("recovery codes", () => {
		it("replaces the whole set and invalidates the old codes", async () => {
			const stale = recoveryCodes[1];
			const response = await post(agent, "/api/auth/mfa/recovery-codes", { currentPassword: PASSWORD, code: stale });

			expect(response.status).toBe(200);
			expect(response.body.data.codes).toHaveLength(10);
			expect(response.body.data.codes).not.toContain(stale);

			recoveryCodes = response.body.data.codes;

			recoveryClient = apiAgent(server);
			await post(recoveryClient, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });
			expect((await post(recoveryClient, "/api/auth/sign-in/mfa", { code: stale })).status).toBe(401);
		});

		it("needs the current password", async () => {
			const response = await post(agent, "/api/auth/mfa/recovery-codes", { currentPassword: "wrong", code: recoveryCodes[0] });

			expect(response.status).toBe(401);
		});

		it("needs an existing second factor", async () => {
			const response = await post(agent, "/api/auth/mfa/recovery-codes", { currentPassword: PASSWORD, code: "000000" });

			expect(response.status).toBe(401);
		});
	});

	describe("disabling", () => {
		it("needs the current password", async () => {
			expect((await post(agent, "/api/auth/mfa/disable", { currentPassword: "wrong", code: recoveryCodes[0] })).status).toBe(401);
			expect((await agent.get("/api/auth/mfa")).body.data.recoveryCodesRemaining).toBe(10);
		});

		it("rejects a missing code at the request boundary", async () => {
			expect((await post(agent, "/api/auth/mfa/disable", { currentPassword: PASSWORD })).status).toBe(400);
			expect((await agent.get("/api/auth/mfa")).body.data.enabled).toBe(true);
		});

		it("rejects an invalid code without changing the factor", async () => {
			expect((await post(agent, "/api/auth/mfa/disable", { currentPassword: PASSWORD, code: "invalid-code" })).status).toBe(401);
			expect((await agent.get("/api/auth/mfa")).body.data).toMatchObject({ enabled: true, recoveryCodesRemaining: 10 });
		});

		it("rejects a spent recovery code", async () => {
			expect((await post(recoveryClient, "/api/auth/sign-in/mfa", { code: recoveryCodes[0] })).status).toBe(200);
			expect((await post(agent, "/api/auth/mfa/disable", { currentPassword: PASSWORD, code: recoveryCodes[0] })).status).toBe(401);
			expect((await agent.get("/api/auth/mfa")).body.data.enabled).toBe(true);
		});

		it("accepts an unused recovery code, drops the factor and restores password-only sign-in", async () => {
			const response = await post(agent, "/api/auth/mfa/disable", { currentPassword: PASSWORD, code: recoveryCodes[1] });

			expect(response.status).toBe(200);
			expect((await recoveryClient.get("/api/auth/session")).status).toBe(401);

			const status = await agent.get("/api/auth/mfa");
			expect(status.body.data).toMatchObject({ enabled: false, pendingEnrollment: false, label: null, recoveryCodesRemaining: 0 });

			const client = apiAgent(server);
			const signIn = await post(client, "/api/auth/sign-in", { username: USERNAME, password: PASSWORD });

			expect(signIn.body.data.mfaRequired).toBe(false);
			expect((await client.get("/api/auth/state")).body.data.authenticated).toBe(true);
		});
	});
});

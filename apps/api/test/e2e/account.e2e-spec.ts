import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/bootstrap.js";
import { RELEASE_CHECKER } from "../../src/modules/meta/release-checker.js";
import { type ApiAgent, apiAgent } from "./utils/http.js";
import { resetDatabase, resetRedis } from "./utils/reset.js";

const USERNAME = "admin";
const PASSWORD = "initial-strong-password";

async function csrfToken(agent: ApiAgent): Promise<string> {
	const response = await agent.get("/api/auth/csrf");
	return response.body.data.csrfToken as string;
}

describe("account (e2e)", () => {
	let app: INestApplication;
	let server: ReturnType<INestApplication["getHttpServer"]>;
	let agent: ApiAgent;
	let token: string;

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
		token = await csrfToken(agent);
		await agent.post("/api/auth/setup").set("x-csrf-token", token).send({ username: USERNAME, password: PASSWORD });
		token = await csrfToken(agent);
	});

	afterAll(async () => {
		await app.close();
	});

	describe("preferences", () => {
		it("defaults to system and persists theme and locale into the session", async () => {
			const before = await agent.get("/api/auth/session");
			expect(before.body.data.theme).toBe("system");
			expect(before.body.data.locale).toBe("system");

			const patch = await agent.patch("/api/account/preferences").set("x-csrf-token", token).send({ theme: "dark", locale: "de" });

			expect(patch.status).toBe(200);
			expect(patch.body.data).toMatchObject({ username: USERNAME, theme: "dark", locale: "de" });

			const after = await agent.get("/api/auth/session");
			expect(after.body.data.theme).toBe("dark");
			expect(after.body.data.locale).toBe("de");
		});

		it("rejects an invalid enum value and unknown fields", async () => {
			const badEnum = await agent.patch("/api/account/preferences").set("x-csrf-token", token).send({ theme: "neon" });
			expect(badEnum.status).toBe(400);
			expect(badEnum.body.data.errorCode).toBe("validation_error");

			const unknown = await agent.patch("/api/account/preferences").set("x-csrf-token", token).send({ foo: true });
			expect(unknown.status).toBe(400);
		});

		it("requires the csrf token", async () => {
			const response = await agent.patch("/api/account/preferences").send({ theme: "light" });
			expect(response.status).toBe(403);
		});
	});

	describe("username", () => {
		it("rejects a wrong current password", async () => {
			const response = await agent
				.patch("/api/account/username")
				.set("x-csrf-token", token)
				.send({ username: "renamed", currentPassword: "wrong-password" });

			expect(response.status).toBe(401);
			expect(response.body.data.errorCode).toBe("unauthorized");
		});

		it("rejects an invalid username format", async () => {
			const response = await agent
				.patch("/api/account/username")
				.set("x-csrf-token", token)
				.send({ username: "-nope", currentPassword: PASSWORD });

			expect(response.status).toBe(400);
			expect(response.body.data.errorCode).toBe("validation_error");
		});

		it("changes the username and reflects it in the session", async () => {
			const response = await agent
				.patch("/api/account/username")
				.set("x-csrf-token", token)
				.send({ username: "renamed", currentPassword: PASSWORD });

			expect(response.status).toBe(200);
			expect(response.body.data.username).toBe("renamed");

			const session = await agent.get("/api/auth/session");
			expect(session.body.data.username).toBe("renamed");
		});
	});
});

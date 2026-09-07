import { describe, expect, it } from "vitest";

import { apiEnvSchema, DEV_DATABASE_URL, DEV_REDIS_URL, webEnvSchema } from "../src/env.js";

const minimalApiEnv = {};

describe("apiEnvSchema", () => {
	it("applies defaults on a minimal environment", () => {
		const env = apiEnvSchema.parse(minimalApiEnv);
		expect(env.NODE_ENV).toBe("development");
		expect(env.PORT).toBe(3001);
		expect(env.BASE_URL).toBe("http://localhost:3000");
		expect(env.UPLOADS_DIR).toBe("uploads");
		expect(env.ARGON2_MEMORY_COST).toBe(65536);
	});

	it("coerces numbers from strings", () => {
		const env = apiEnvSchema.parse({ ...minimalApiEnv, PORT: "4000", SESSION_TTL_HOURS: "24" });
		expect(env.PORT).toBe(4000);
		expect(env.SESSION_TTL_HOURS).toBe(24);
	});

	it("strips trailing slashes from BASE_URL", () => {
		const env = apiEnvSchema.parse({ ...minimalApiEnv, BASE_URL: "https://img.example.com/" });
		expect(env.BASE_URL).toBe("https://img.example.com");
	});

	it("rejects a BASE_URL without a scheme", () => {
		expect(apiEnvSchema.safeParse({ ...minimalApiEnv, BASE_URL: "localhost:3000" }).success).toBe(false);
	});

	it("points a bare environment at the local compose stack, so dev needs no env file", () => {
		const env = apiEnvSchema.parse({});
		expect(env.DATABASE_URL).toBe(DEV_DATABASE_URL);
		expect(env.REDIS_URL).toBe(DEV_REDIS_URL);
	});

	it("rejects a database URL that is not a URL", () => {
		expect(apiEnvSchema.safeParse({ DATABASE_URL: "snapshot" }).success).toBe(false);
	});

	it("defaults development secrets and session lifetimes", () => {
		const env = apiEnvSchema.parse(minimalApiEnv);
		expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
		expect(env.MFA_ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(32);
		expect(env.SESSION_TTL_HOURS).toBe(24);
		expect(env.SESSION_ABSOLUTE_TTL_HOURS).toBe(168);
	});

	it("rejects the insecure default session secret in production", () => {
		const result = apiEnvSchema.safeParse({ ...minimalApiEnv, NODE_ENV: "production" });
		expect(result.success).toBe(false);
	});

	it("accepts independent strong secrets in production", () => {
		const result = apiEnvSchema.safeParse({
			...minimalApiEnv,
			NODE_ENV: "production",
			SESSION_SECRET: "x".repeat(48),
			MFA_ENCRYPTION_KEY: "y".repeat(48),
		});
		expect(result.success).toBe(true);
	});

	it("rejects a session inactivity lifetime above the absolute lifetime", () => {
		const result = apiEnvSchema.safeParse({
			...minimalApiEnv,
			SESSION_TTL_HOURS: 48,
			SESSION_ABSOLUTE_TTL_HOURS: 24,
		});
		expect(result.success).toBe(false);
	});

	describe("APP_VERSION", () => {
		it("is absent by default", () => {
			expect(apiEnvSchema.parse(minimalApiEnv).APP_VERSION).toBeUndefined();
		});

		it.each(["1.2.3", "v1.2.3", " 1.2.3 ", "1.2.3-rc.1"])("accepts %j and strips the v", (value) => {
			expect(apiEnvSchema.parse({ ...minimalApiEnv, APP_VERSION: value }).APP_VERSION).toMatch(/^1\.2\.3/);
		});

		it.each(["", "latest", "main", "1.2", "not-a-version"])("drops %j instead of failing the boot", (value) => {
			const result = apiEnvSchema.safeParse({ ...minimalApiEnv, APP_VERSION: value });
			expect(result.success).toBe(true);
			expect(result.data?.APP_VERSION).toBeUndefined();
		});
	});
});

describe("webEnvSchema", () => {
	it("defaults the internal API URL", () => {
		expect(webEnvSchema.parse({}).API_INTERNAL_URL).toBe("http://localhost:3001");
	});
});

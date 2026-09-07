import { describe, expect, it } from "vitest";

import {
	accountViewSchema,
	localeChoiceSchema,
	loginRequestSchema,
	mfaDisableRequestSchema,
	passwordChangeRequestSchema,
	passwordSchema,
	preferencesUpdateSchema,
	sessionDataSchema,
	sessionInfoSchema,
	sessionRevokeRequestSchema,
	setupRequestSchema,
	themeChoiceSchema,
	usernameChangeRequestSchema,
	usernameSchema,
} from "../src/auth.js";

describe("usernameSchema", () => {
	it.each(["admin", "user.name", "a1-b2_c3", "X"])("accepts %s", (value) => {
		expect(usernameSchema.parse(value)).toBe(value);
	});

	it.each(["", "   ", "-bad", ".bad", "has space", "x".repeat(65)])("rejects %j", (value) => {
		expect(usernameSchema.safeParse(value).success).toBe(false);
	});
});

describe("passwordSchema", () => {
	it("accepts a 12+ character password", () => {
		expect(passwordSchema.parse("correct horse battery")).toBe("correct horse battery");
	});

	it.each(["short", "x".repeat(2000)])("rejects out-of-bounds passwords", (value) => {
		expect(passwordSchema.safeParse(value).success).toBe(false);
	});
});

describe("request schemas", () => {
	it.each([undefined, "", "   ", "x".repeat(65)])("disabling MFA rejects a missing or invalid code %j", (code) => {
		expect(mfaDisableRequestSchema.safeParse({ currentPassword: "password", code }).success).toBe(false);
	});

	it.each(["123456", "ABCDE-FG234"])("disabling MFA accepts a second-factor code %s", (code) => {
		expect(mfaDisableRequestSchema.parse({ currentPassword: "password", code })).toEqual({ currentPassword: "password", code });
		expect(mfaDisableRequestSchema.safeParse({ currentPassword: "", code }).success).toBe(false);
	});

	it("normalizes the second factor when disabling MFA", () => {
		expect(mfaDisableRequestSchema.parse({ currentPassword: "password", code: " abcde-fg234 " }).code).toBe("ABCDE-FG234");
	});

	it("setup enforces the credential policy", () => {
		expect(setupRequestSchema.safeParse({ username: "admin", password: "short" }).success).toBe(false);
	});

	it("login is lenient and leaks no policy", () => {
		expect(loginRequestSchema.safeParse({ username: "x", password: "y" }).success).toBe(true);
		expect(loginRequestSchema.safeParse({ username: "", password: "y" }).success).toBe(false);
	});

	it("password change validates only the new password", () => {
		const result = passwordChangeRequestSchema.safeParse({
			currentPassword: "x",
			newPassword: "a different good one",
		});
		expect(result.success).toBe(true);
	});
});

describe("session schemas", () => {
	it("accepts a full session info record", () => {
		const result = sessionInfoSchema.safeParse({
			id: "sess-1",
			ip: "203.0.113.7",
			userAgent: "Mozilla/5.0",
			createdAt: "2026-07-11T12:00:00+00:00",
			lastSeenAt: "2026-07-11T12:05:00+00:00",
			current: true,
		});
		expect(result.success).toBe(true);
	});

	it("allows null ip and user agent", () => {
		const result = sessionInfoSchema.safeParse({
			id: "sess-1",
			ip: null,
			userAgent: null,
			createdAt: "2026-07-11T12:00:00+00:00",
			lastSeenAt: "2026-07-11T12:00:00+00:00",
			current: false,
		});
		expect(result.success).toBe(true);
	});

	it("revoke request accepts an empty body or a session id", () => {
		expect(sessionRevokeRequestSchema.safeParse({}).success).toBe(true);
		expect(sessionRevokeRequestSchema.safeParse({ sessionId: "sess-2" }).success).toBe(true);
		expect(sessionRevokeRequestSchema.safeParse({ sessionId: "" }).success).toBe(false);
	});
});

describe("account & preferences schemas", () => {
	it.each(["system", "light", "dark"])("theme accepts %s", (value) => {
		expect(themeChoiceSchema.parse(value)).toBe(value);
	});

	it("theme rejects an unknown value", () => {
		expect(themeChoiceSchema.safeParse("sepia").success).toBe(false);
	});

	it.each(["system", "en", "de"])("locale accepts %s", (value) => {
		expect(localeChoiceSchema.parse(value)).toBe(value);
	});

	it("locale rejects an unsupported value", () => {
		expect(localeChoiceSchema.safeParse("fr").success).toBe(false);
	});

	it("preferences update is partial but strict", () => {
		expect(preferencesUpdateSchema.safeParse({}).success).toBe(true);
		expect(preferencesUpdateSchema.safeParse({ theme: "dark" }).success).toBe(true);
		expect(preferencesUpdateSchema.safeParse({ locale: "de" }).success).toBe(true);
		expect(preferencesUpdateSchema.safeParse({ theme: "neon" }).success).toBe(false);
		expect(preferencesUpdateSchema.safeParse({ unknown: true }).success).toBe(false);
	});

	it("username change requires a valid username and a non-empty password", () => {
		expect(usernameChangeRequestSchema.safeParse({ username: "admin", currentPassword: "x" }).success).toBe(true);
		expect(usernameChangeRequestSchema.safeParse({ username: "-bad", currentPassword: "x" }).success).toBe(false);
		expect(usernameChangeRequestSchema.safeParse({ username: "admin", currentPassword: "" }).success).toBe(false);
	});

	it("account view and session data carry theme and locale", () => {
		expect(accountViewSchema.safeParse({ username: "admin", theme: "dark", locale: "en" }).success).toBe(true);
		expect(sessionDataSchema.safeParse({ username: "admin", csrfToken: "t", theme: "system", locale: "system" }).success).toBe(true);
		expect(sessionDataSchema.safeParse({ username: "admin", csrfToken: "t" }).success).toBe(false);
	});
});

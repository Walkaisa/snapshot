import { TOTP_PERIOD_SECONDS } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";

import { generateTotpSecret, matchTotp, totpUri } from "../../../src/modules/auth/totp.js";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("matchTotp", () => {
	it.each([
		[59_000, "287082"],
		[1_111_111_109_000, "081804"],
		[1_234_567_890_000, "005924"],
	])("accepts the RFC 6238 vector at %i", (timestamp, token) => {
		expect(matchTotp(RFC_SECRET, token, timestamp)).not.toBeNull();
	});

	it("reports the timestep the code belongs to", () => {
		const match = matchTotp(RFC_SECRET, "287082", 59_000);

		expect(match?.counter).toBe(Math.floor(59 / TOTP_PERIOD_SECONDS));
	});

	it("accepts the neighbouring step so a slow clock still works", () => {
		const previousStep = 59_000 + TOTP_PERIOD_SECONDS * 1000;

		expect(matchTotp(RFC_SECRET, "287082", previousStep)).not.toBeNull();
	});

	it("rejects a code two steps out", () => {
		const farStep = 59_000 + TOTP_PERIOD_SECONDS * 1000 * 3;

		expect(matchTotp(RFC_SECRET, "287082", farStep)).toBeNull();
	});

	it("rejects a wrong or malformed code without throwing", () => {
		expect(matchTotp(RFC_SECRET, "000000", 59_000)).toBeNull();
		expect(matchTotp(RFC_SECRET, "not-a-code", 59_000)).toBeNull();
		expect(matchTotp("not-base32!", "287082", 59_000)).toBeNull();
	});
});

describe("generateTotpSecret", () => {
	it("mints a 160-bit base32 secret", () => {
		const secret = generateTotpSecret();

		expect(secret).toMatch(/^[A-Z2-7]{32}$/);
		expect(generateTotpSecret()).not.toBe(secret);
	});
});

describe("totpUri", () => {
	it("carries the issuer, account and parameters an authenticator app needs", () => {
		const uri = new URL(totpUri(RFC_SECRET, "Snapshot", "admin"));

		expect(uri.protocol).toBe("otpauth:");
		expect(decodeURIComponent(uri.pathname)).toContain("Snapshot:admin");
		expect(uri.searchParams.get("secret")).toBe(RFC_SECRET);
		expect(uri.searchParams.get("issuer")).toBe("Snapshot");
		expect(uri.searchParams.get("digits")).toBe("6");
		expect(uri.searchParams.get("period")).toBe(String(TOTP_PERIOD_SECONDS));
	});
});

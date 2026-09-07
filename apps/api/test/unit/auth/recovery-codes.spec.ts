import { RECOVERY_CODE_COUNT, RECOVERY_CODE_PATTERN } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";

import {
	generateRecoveryCodes,
	hashRecoveryCode,
	normalizeRecoveryCode,
	recoveryCodeMatches,
} from "../../../src/modules/auth/recovery-codes.js";

describe("generateRecoveryCodes", () => {
	it("mints the contracted number of distinct codes", () => {
		const codes = generateRecoveryCodes();

		expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
		expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
	});

	it("matches the format the dashboard advertises", () => {
		for (const code of generateRecoveryCodes()) {
			expect(code).toMatch(RECOVERY_CODE_PATTERN);
		}
	});

	it("omits characters that read alike", () => {
		expect(generateRecoveryCodes(64).join("")).not.toMatch(/[IO01]/);
	});
});

describe("normalizeRecoveryCode", () => {
	it.each(["abcde-fghij", "ABCDE FGHIJ", " abcdefghij ", "ABCDE-FGHIJ"])("folds %j onto one form", (input) => {
		expect(normalizeRecoveryCode(input)).toBe("ABCDEFGHIJ");
	});
});

describe("hashRecoveryCode", () => {
	it("hashes the normalized form, so casing and dashes do not matter", () => {
		expect(hashRecoveryCode("abcde-fghij")).toBe(hashRecoveryCode("ABCDEFGHIJ"));
	});

	it("never returns the code itself", () => {
		const hash = hashRecoveryCode("ABCDE-FGHIJ");

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toContain("ABCDE");
	});
});

describe("recoveryCodeMatches", () => {
	it("accepts the hash of the same code", () => {
		expect(recoveryCodeMatches(hashRecoveryCode("ABCDE-FGHIJ"), hashRecoveryCode("abcde fghij"))).toBe(true);
	});

	it("rejects a different code", () => {
		expect(recoveryCodeMatches(hashRecoveryCode("ABCDE-FGHIJ"), hashRecoveryCode("KLMNP-QRSTU"))).toBe(false);
	});

	it.each(["", "abc"])("rejects the unusable stored hash %j instead of throwing", (stored) => {
		expect(recoveryCodeMatches(hashRecoveryCode("ABCDE-FGHIJ"), stored)).toBe(false);
	});
});

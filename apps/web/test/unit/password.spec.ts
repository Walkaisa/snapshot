import { PASSWORD_MIN_LENGTH } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";

import { evaluatePassword, passwordStrength } from "@/lib/password";

describe("evaluatePassword", () => {
	it("flags each requirement independently", () => {
		expect(evaluatePassword("short")).toMatchObject({
			length: false,
			lowercase: true,
			uppercase: false,
			number: false,
			symbol: false,
		});
	});

	it("passes every requirement for a diverse long password", () => {
		expect(evaluatePassword("Aa1!aaaaaaaa")).toEqual({
			length: true,
			lowercase: true,
			uppercase: true,
			number: true,
			symbol: true,
		});
	});

	it("takes the length threshold from the contract the API enforces", () => {
		expect(evaluatePassword("a".repeat(PASSWORD_MIN_LENGTH)).length).toBe(true);
		expect(evaluatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1)).length).toBe(false);
	});
});

describe("passwordStrength", () => {
	it("is weak for empty or trivial input", () => {
		expect(passwordStrength("").level).toBe("weak");
		expect(passwordStrength("aaa").level).toBe("weak");
	});

	it("climbs as diversity increases", () => {
		expect(passwordStrength("aaaaaaaaaaaa").level).toBe("fair");
		expect(passwordStrength("Aa1!aaaaaaaa").level).toBe("strong");
	});

	it("scores the requirements it met, so the meter can size itself", () => {
		expect(passwordStrength("Aa1!aaaaaaaa").score).toBe(5);
		expect(passwordStrength("").score).toBe(0);
	});
});

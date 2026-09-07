import { describe, expect, it } from "vitest";

import {
	countIdCharacterClasses,
	effectiveIdMinimums,
	ID_ALPHABET_MIN_SIZE,
	ID_CHARSET_KEYS,
	ID_CHARSETS,
	type IdAlphabet,
	type IdCharset,
	idAlphabetSchema,
	idCollisionHeadroom,
	idCombinations,
	idCompositionWeights,
	idEntropyBits,
	idSchema,
	isReservedId,
	RESERVED_IDS,
	resolveIdAlphabet,
} from "../src/ids.js";

const charsets = (...keys: IdCharset[]): IdAlphabet => ({ mode: "charsets", charsets: keys });

describe("idSchema", () => {
	it.each(["a", "abc123XYZ", "a-b_c", "x".repeat(64)])("accepts %j", (value) => {
		expect(idSchema.parse(value)).toBe(value);
	});

	it.each(["", "../escape", "with.dot", "with space", "x".repeat(65), "sla/sh"])("rejects %j", (value) => {
		expect(idSchema.safeParse(value).success).toBe(false);
	});
});

describe("idCollisionHeadroom", () => {
	it("is the square root of the keyspace — where a repeat draw becomes likely", () => {
		expect(idCollisionHeadroom(1_000_000)).toBe(1000);
		expect(idCollisionHeadroom(idCombinations("abcdefgh", 4, { digits: 0, symbols: 0 }))).toBe(64);
	});

	it("has no headroom when nothing can be drawn", () => {
		expect(idCollisionHeadroom(0)).toBe(0);
	});
});

describe("RESERVED_IDS", () => {
	it.each([
		"overview",
		"gallery",
		"links",
		"uploads",
		"shortener",
		"rate-limit",
		"sharex",
		"api-key",
		"profile",
		"security",
		"appearance",
		"setup",
		"sign-in",
		"sign-out",
		"api",
		"raw",
	])("reserves the %s route slug", (slug) => {
		expect(RESERVED_IDS).toContain(slug);
	});

	it("matches reserved ids case-insensitively", () => {
		expect(isReservedId("Sign-In")).toBe(true);
		expect(isReservedId("API")).toBe(true);
	});

	it("leaves a normal id alone", () => {
		expect(isReservedId("abc123XYZ")).toBe(false);
	});

	it("only reserves ids the namespace can actually issue", () => {
		for (const reserved of RESERVED_IDS) {
			expect(idSchema.safeParse(reserved).success).toBe(true);
		}
	});
});

describe("resolveIdAlphabet", () => {
	it("concatenates the selected sets in a stable order regardless of input order", () => {
		const forwards = resolveIdAlphabet(charsets("lowercase", "digits"));
		const backwards = resolveIdAlphabet(charsets("digits", "lowercase"));

		expect(forwards).toBe(`${ID_CHARSETS.lowercase}${ID_CHARSETS.digits}`);
		expect(backwards).toBe(forwards);
	});

	it("covers every declared charset", () => {
		expect(resolveIdAlphabet(charsets(...ID_CHARSET_KEYS))).toHaveLength(26 + 26 + 10 + 2);
	});

	it("deduplicates custom characters", () => {
		expect(resolveIdAlphabet({ mode: "custom", characters: "aabbcc" })).toBe("abc");
	});
});

describe("idAlphabetSchema", () => {
	it("accepts a charset selection with enough characters", () => {
		expect(idAlphabetSchema.safeParse(charsets("lowercase")).success).toBe(true);
		expect(idAlphabetSchema.safeParse(charsets("digits")).success).toBe(true);
	});

	it("rejects an empty charset selection", () => {
		expect(idAlphabetSchema.safeParse({ mode: "charsets", charsets: [] }).success).toBe(false);
	});

	it("rejects a charset selection too small to be worth generating from", () => {
		expect(idAlphabetSchema.safeParse(charsets("symbols")).success).toBe(false);
	});

	it("accepts custom characters", () => {
		expect(idAlphabetSchema.safeParse({ mode: "custom", characters: "abcdefgh" }).success).toBe(true);
	});

	it.each(["abc", "aaaaaaaaaa"])("rejects fewer than %s distinct custom characters", (characters) => {
		const result = idAlphabetSchema.safeParse({ mode: "custom", characters });

		expect(result.success).toBe(false);
		expect(new Set(characters).size).toBeLessThan(ID_ALPHABET_MIN_SIZE);
	});

	it.each(["abcdefgh.", "abcdefgh/", "abcdefg h", "abcdefgh?"])("rejects url-unsafe characters in %j", (characters) => {
		expect(idAlphabetSchema.safeParse({ mode: "custom", characters }).success).toBe(false);
	});

	it("rejects an unknown mode", () => {
		expect(idAlphabetSchema.safeParse({ mode: "random", characters: "abcdefgh" }).success).toBe(false);
	});

	it("only resolves to characters a public id may contain", () => {
		const alphabet = resolveIdAlphabet(charsets(...ID_CHARSET_KEYS));

		expect(idSchema.safeParse(alphabet.slice(0, 64)).success).toBe(true);
	});
});

const NONE = { digits: 0, symbols: 0 };

describe("countIdCharacterClasses", () => {
	it("splits an alphabet into digits, symbols and everything else", () => {
		expect(countIdCharacterClasses(resolveIdAlphabet(charsets(...ID_CHARSET_KEYS)))).toEqual({
			digits: 10,
			symbols: 2,
			others: 52,
		});
	});

	it("counts an alphabet without either class", () => {
		expect(countIdCharacterClasses(ID_CHARSETS.lowercase)).toEqual({ digits: 0, symbols: 0, others: 26 });
	});
});

describe("effectiveIdMinimums", () => {
	it("keeps a minimum whose class the alphabet contains", () => {
		expect(effectiveIdMinimums(resolveIdAlphabet(charsets("lowercase", "digits")), { digits: 2, symbols: 2 })).toEqual({
			digits: 2,
			symbols: 0,
		});
	});

	it("drops both minimums for an alphabet with neither class", () => {
		expect(effectiveIdMinimums(ID_CHARSETS.lowercase, { digits: 3, symbols: 3 })).toEqual({ digits: 0, symbols: 0 });
	});
});

describe("idCombinations", () => {
	it("is the plain keyspace when nothing is required", () => {
		expect(idCombinations(resolveIdAlphabet(charsets("lowercase", "uppercase", "digits")), 10, NONE)).toBeCloseTo(62 ** 10, -5);
		expect(idCombinations("ab", 3, NONE)).toBe(8);
	});

	it("shrinks once a class is required", () => {
		const alphabet = "ab01";

		expect(idCombinations(alphabet, 3, { digits: 1, symbols: 0 })).toBeLessThan(idCombinations(alphabet, 3, NONE));
	});

	it("counts a tiny shape exactly", () => {
		expect(idCombinations("ab01", 3, { digits: 1, symbols: 0 })).toBe(4 ** 3 - 2 ** 3);
	});

	it("ignores a minimum for a class the alphabet lacks", () => {
		expect(idCombinations(ID_CHARSETS.lowercase, 4, { digits: 2, symbols: 2 })).toBe(26 ** 4);
	});

	it("is zero for a shape nothing can satisfy", () => {
		expect(idCombinations(resolveIdAlphabet(charsets(...ID_CHARSET_KEYS)), 2, { digits: 2, symbols: 2 })).toBe(0);
		expect(idCombinations("", 4, NONE)).toBe(0);
		expect(idCombinations("abcd", 0, NONE)).toBe(0);
	});
});

describe("idCompositionWeights", () => {
	it("never proposes a composition the alphabet cannot fill", () => {
		for (const composition of idCompositionWeights(ID_CHARSETS.lowercase, 5, NONE)) {
			expect(composition.digits).toBe(0);
			expect(composition.symbols).toBe(0);
		}
	});

	it("sums to the combination count", () => {
		const alphabet = resolveIdAlphabet(charsets("lowercase", "digits", "symbols"));
		const minimums = { digits: 2, symbols: 1 };
		const summed = idCompositionWeights(alphabet, 8, minimums).reduce((total, entry) => total + entry.weight, 0);

		expect(summed).toBeCloseTo(idCombinations(alphabet, 8, minimums), -5);
	});

	it("respects the required minimums in every composition", () => {
		for (const composition of idCompositionWeights(resolveIdAlphabet(charsets(...ID_CHARSET_KEYS)), 8, { digits: 2, symbols: 1 })) {
			expect(composition.digits).toBeGreaterThanOrEqual(2);
			expect(composition.symbols).toBeGreaterThanOrEqual(1);
		}
	});
});

describe("idEntropyBits", () => {
	it("is the log2 of the keyspace", () => {
		expect(idEntropyBits(2 ** 60)).toBe(60);
		expect(Math.round(idEntropyBits(62 ** 7))).toBe(42);
	});

	it("reports nothing for a keyspace of one or none", () => {
		expect(idEntropyBits(1)).toBe(0);
		expect(idEntropyBits(0)).toBe(0);
	});
});

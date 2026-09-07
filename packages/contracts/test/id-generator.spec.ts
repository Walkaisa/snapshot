import { describe, expect, it } from "vitest";

import {
	generateId,
	generateUnreservedId,
	ID_CHARSETS,
	type IdAlphabet,
	idCombinations,
	isReservedId,
	RESERVED_IDS,
	resolveIdAlphabet,
} from "../src/ids.js";

const alphanumeric: IdAlphabet = { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] };
const everything: IdAlphabet = { mode: "charsets", charsets: ["lowercase", "uppercase", "digits", "symbols"] };

const NONE = { digits: 0, symbols: 0 };

function countOf(id: string, pool: string): number {
	return [...id].filter((character) => pool.includes(character)).length;
}

describe("generateId", () => {
	it("produces an id of the requested length from the given characters", () => {
		for (let run = 0; run < 50; run += 1) {
			const id = generateId(resolveIdAlphabet(alphanumeric), 10, NONE);

			expect(id).toHaveLength(10);
			expect(/^[A-Za-z0-9]+$/.test(id)).toBe(true);
		}
	});

	it("draws only from a custom alphabet", () => {
		const characters = "abcdef01";

		for (let run = 0; run < 50; run += 1) {
			for (const character of generateId(characters, 12, NONE)) {
				expect(characters).toContain(character);
			}
		}
	});

	it("uses every character of a small alphabet", () => {
		expect(new Set(generateId("ab", 200, NONE))).toEqual(new Set(["a", "b"]));
	});

	it("honours a minimum number of digits", () => {
		for (let run = 0; run < 200; run += 1) {
			const id = generateId(resolveIdAlphabet(alphanumeric), 8, { digits: 3, symbols: 0 });

			expect(countOf(id, ID_CHARSETS.digits)).toBeGreaterThanOrEqual(3);
			expect(id).toHaveLength(8);
		}
	});

	it("honours a minimum number of symbols alongside digits", () => {
		for (let run = 0; run < 200; run += 1) {
			const id = generateId(resolveIdAlphabet(everything), 7, { digits: 1, symbols: 2 });

			expect(countOf(id, ID_CHARSETS.symbols)).toBeGreaterThanOrEqual(2);
			expect(countOf(id, ID_CHARSETS.digits)).toBeGreaterThanOrEqual(1);
		}
	});

	it("spreads the required characters across the id rather than clustering them at the front", () => {
		const positions = new Set<number>();

		for (let run = 0; run < 300; run += 1) {
			const id = generateId(resolveIdAlphabet(everything), 8, { digits: 0, symbols: 1 });

			positions.add([...id].findIndex((character) => ID_CHARSETS.symbols.includes(character)));
		}

		expect(positions.size).toBeGreaterThan(4);
	});

	it("can fill an id entirely with a required class", () => {
		expect(countOf(generateId(resolveIdAlphabet(everything), 4, { digits: 4, symbols: 0 }), ID_CHARSETS.digits)).toBe(4);
	});

	it("drops a minimum for a class the alphabet does not contain", () => {
		const id = generateId(ID_CHARSETS.digits, 4, { digits: 0, symbols: 1 });

		expect(id).toHaveLength(4);
		expect(countOf(id, ID_CHARSETS.symbols)).toBe(0);
	});

	it("refuses a shape it cannot satisfy", () => {
		expect(() => generateId(resolveIdAlphabet(everything), 2, { digits: 2, symbols: 2 })).toThrow();
		expect(() => generateId("", 4, NONE)).toThrow();
	});

	it("reaches the whole keyspace the combination count promises", () => {
		const alphabet = "ab01";
		const minimums = { digits: 1, symbols: 0 };
		const seen = new Set<string>();

		for (let run = 0; run < 4000; run += 1) {
			seen.add(generateId(alphabet, 3, minimums));
		}

		expect(seen.size).toBe(idCombinations(alphabet, 3, minimums));
	});

	it("draws every valid string with roughly equal probability", () => {
		const alphabet = "ab01";
		const minimums = { digits: 1, symbols: 0 };
		const runs = 24_000;
		const expected = runs / idCombinations(alphabet, 3, minimums);
		const counts = new Map<string, number>();

		for (let run = 0; run < runs; run += 1) {
			const id = generateId(alphabet, 3, minimums);
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}

		for (const count of counts.values()) {
			expect(count).toBeGreaterThan(expected * 0.6);
			expect(count).toBeLessThan(expected * 1.4);
		}
	});
});

describe("generateUnreservedId", () => {
	it("never returns a reserved id", () => {
		for (let run = 0; run < 200; run += 1) {
			expect(isReservedId(generateUnreservedId({ alphabet: alphanumeric, length: 6, minimums: NONE }))).toBe(false);
		}
	});

	it("keeps drawing until it clears an alphabet that can only produce reserved ids", () => {
		const shortest = [...RESERVED_IDS].reduce((a, b) => (a.length <= b.length ? a : b));
		const alphabet: IdAlphabet = { mode: "custom", characters: `${shortest}xyz` };
		const id = generateUnreservedId({ alphabet, length: shortest.length, minimums: NONE });

		expect(isReservedId(id)).toBe(false);
		expect(id).toHaveLength(shortest.length);
	});

	it("drops a minimum the alphabet cannot honour instead of failing", () => {
		const id = generateUnreservedId({ alphabet: alphanumeric, length: 8, minimums: { digits: 1, symbols: 3 } });

		expect(id).toHaveLength(8);
		expect(countOf(id, ID_CHARSETS.symbols)).toBe(0);
	});

	it("honours the configured length", () => {
		expect(generateUnreservedId({ alphabet: alphanumeric, length: 24, minimums: NONE })).toHaveLength(24);
	});
});

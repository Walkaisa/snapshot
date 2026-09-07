import { describe, expect, it } from "vitest";

import { parseByteRange } from "../../../src/modules/uploads/http-range.js";

const SIZE = 1000;

describe("parseByteRange", () => {
	it("returns null without a Range header so the full body is served", () => {
		expect(parseByteRange(undefined, SIZE)).toBeNull();
	});

	it.each([
		["bytes=0-99", { start: 0, end: 99 }],
		["bytes=500-999", { start: 500, end: 999 }],
		["bytes=0-0", { start: 0, end: 0 }],
	])("parses %s", (header, expected) => {
		expect(parseByteRange(header, SIZE)).toEqual(expected);
	});

	it("treats an open end as the rest of the file — the browser's opening video request", () => {
		expect(parseByteRange("bytes=0-", SIZE)).toEqual({ start: 0, end: 999 });
	});

	it("clamps an end past EOF", () => {
		expect(parseByteRange("bytes=900-5000", SIZE)).toEqual({ start: 900, end: 999 });
	});

	it("resolves a suffix range to the last bytes", () => {
		expect(parseByteRange("bytes=-100", SIZE)).toEqual({ start: 900, end: 999 });
	});

	it("clamps an oversized suffix to the whole file", () => {
		expect(parseByteRange("bytes=-5000", SIZE)).toEqual({ start: 0, end: 999 });
	});

	it.each(["bytes=1000-", "bytes=1500-1600", "bytes=-0"])("marks %s unsatisfiable", (header) => {
		expect(parseByteRange(header, SIZE)).toBe("unsatisfiable");
	});

	it("marks any range on an empty file unsatisfiable", () => {
		expect(parseByteRange("bytes=0-10", 0)).toBe("unsatisfiable");
		expect(parseByteRange("bytes=-10", 0)).toBe("unsatisfiable");
	});

	it("rejects an inverted range", () => {
		expect(parseByteRange("bytes=500-100", SIZE)).toBe("unsatisfiable");
	});

	it.each(["bytes=abc-def", "items=0-99", "bytes=0-99, 200-299", "garbage", "bytes=-"])(
		"falls back to the full body for unsupported form %j",
		(header) => {
			expect(parseByteRange(header, SIZE)).toBeNull();
		},
	);
});

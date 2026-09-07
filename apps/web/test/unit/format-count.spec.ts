import { describe, expect, it } from "vitest";

import { formatMagnitude } from "@/lib/format-count";

describe("formatMagnitude", () => {
	it("writes small counts out in full", () => {
		expect(formatMagnitude(531_441, "en")).toBe("531,441");
		expect(formatMagnitude(531_441, "de")).toBe("531.441");
		expect(formatMagnitude(8, "en")).toBe("8");
	});

	it("switches to a power of ten once the number stops being readable", () => {
		expect(formatMagnitude(8.39e17, "en")).toBe("8.4 × 10¹⁷");
		expect(formatMagnitude(8.39e17, "de")).toBe("8,4 × 10¹⁷");
	});

	it("keeps the exponent legible for a very large keyspace", () => {
		expect(formatMagnitude(4e115, "en")).toBe("4 × 10¹¹⁵");
	});

	it("reports nothing usable as zero", () => {
		expect(formatMagnitude(0, "en")).toBe("0");
		expect(formatMagnitude(Number.NaN, "en")).toBe("0");
		expect(formatMagnitude(Number.POSITIVE_INFINITY, "en")).toBe("0");
	});
});

import { describe, expect, it } from "vitest";

import { fillTemplate, humanReadableSize, normalizeExtension, parseCsv, renderTemplate, templatePlaceholders } from "../src/utils.js";

describe("parseCsv", () => {
	it("splits, trims and drops empty items", () => {
		expect(parseCsv(" a, b ,, c ")).toEqual(["a", "b", "c"]);
		expect(parseCsv("")).toEqual([]);
	});
});

describe("normalizeExtension", () => {
	it("lowercases and prepends a dot", () => {
		expect(normalizeExtension("PNG")).toBe(".png");
		expect(normalizeExtension(".JPG ")).toBe(".jpg");
		expect(normalizeExtension("")).toBe("");
	});
});

describe("humanReadableSize", () => {
	it.each([
		[0, "0.0 B"],
		[512, "512.0 B"],
		[2048, "2.0 KB"],
		[52428800, "50.0 MB"],
		[1024 ** 4 * 3, "3.0 TB"],
	])("formats %d as %s", (input, expected) => {
		expect(humanReadableSize(input)).toBe(expected);
	});
});

describe("templates", () => {
	it("extracts placeholder names", () => {
		expect(templatePlaceholders("{a} and {b}")).toEqual(["a", "b"]);
	});

	it("renderTemplate replaces values and throws on unknown variables", () => {
		expect(renderTemplate("{name}!", { name: "Snapshot" })).toBe("Snapshot!");
		expect(() => renderTemplate("{nope}", {})).toThrow("Unknown template variable: {nope}");
	});

	it("fillTemplate keeps unknown placeholders literal", () => {
		expect(fillTemplate("{name} {nope}", { name: "Snapshot" })).toBe("Snapshot {nope}");
	});
});

import { describe, expect, it } from "vitest";

import { toCamelCase, toSnakeCase } from "../../../src/common/utils/case.js";

const CONFIG_KEYS = [
	"apiKey",
	"maxFileSizeBytes",
	"uploadIdLength",
	"allowedExtensions",
	"allowedMimeTypes",
	"rateLimitRequests",
	"rateLimitEnabled",
	"rateLimitWindowSeconds",
	"embedDescriptionTemplate",
	"embedThemeColor",
	"timezone",
];

describe("toSnakeCase", () => {
	it.each([
		["apiKey", "api_key"],
		["maxFileSizeBytes", "max_file_size_bytes"],
		["checksumSha256", "checksum_sha256"],
		["timezone", "timezone"],
	])("converts %s to %s", (input, expected) => {
		expect(toSnakeCase(input)).toBe(expected);
	});
});

describe("toCamelCase", () => {
	it.each([
		["api_key", "apiKey"],
		["embed_theme_color", "embedThemeColor"],
		["checksum_sha256", "checksumSha256"],
		["timezone", "timezone"],
	])("converts %s to %s", (input, expected) => {
		expect(toCamelCase(input)).toBe(expected);
	});
});

describe("case round-trip", () => {
	it.each(CONFIG_KEYS)("restores %s after snake/camel conversion", (key) => {
		expect(toCamelCase(toSnakeCase(key))).toBe(key);
	});
});

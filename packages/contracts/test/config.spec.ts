import { describe, expect, it } from "vitest";

import {
	apiKeySchema,
	configUpdateSchema,
	configViewSchema,
	embedTemplateSchema,
	extensionsCsvSchema,
	localeSchema,
	mimeTypesCsvSchema,
	runtimeConfigSchema,
	themeColorSchema,
	timezoneSchema,
} from "../src/config.js";

const validConfig = {
	apiKey: "x".repeat(48),
	maxFileSizeBytes: 52428800,
	maxTotalStorageBytes: null,
	uploadIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
	uploadIdMinDigits: 2,
	uploadIdMinSymbols: 2,
	uploadIdLength: 10,
	linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
	linkIdMinDigits: 2,
	linkIdMinSymbols: 2,
	linkIdLength: 10,
	allowedExtensions: null,
	allowedMimeTypes: null,
	auditRetentionDays: 90,
	rateLimitEnabled: true,
	rateLimitRequests: 120,
	rateLimitWindowSeconds: 60,
	embedEnabled: true,
	embedProviderName: "Snapshot",
	embedTitleTemplate: "{filename}",
	embedDescriptionTemplate: "{size_human} | {created_at}",
	embedThemeColor: "#5865F2",
	embedLocale: "en_US",
	timezone: "UTC",
};

describe("themeColorSchema", () => {
	it.each(["#5865F2", "#000000", "#a1B2c3"])("accepts %s", (value) => {
		expect(themeColorSchema.parse(value)).toBe(value);
	});

	it.each(["blue", "#12345", "#GGGGGG", "5865F2", "#5865F2AA"])("rejects %s", (value) => {
		expect(themeColorSchema.safeParse(value).success).toBe(false);
	});
});

describe("embedTemplateSchema", () => {
	it("accepts every known variable", () => {
		const template = "{id} {filename} {extension} {content_type} {size} {size_human} {created_at} {provider}";
		expect(embedTemplateSchema.safeParse(template).success).toBe(true);
	});

	it.each(["{unknown}", "{file.__dict__}", "ok {nope}"])("rejects %s", (value) => {
		const result = embedTemplateSchema.safeParse(value);
		expect(result.success).toBe(false);
	});

	it("accepts templates without placeholders", () => {
		expect(embedTemplateSchema.safeParse("Uploaded with Snapshot").success).toBe(true);
	});
});

describe("timezoneSchema", () => {
	it.each(["UTC", "Europe/Berlin", "America/New_York"])("accepts %s", (value) => {
		expect(timezoneSchema.parse(value)).toBe(value);
	});

	it("rejects unknown zones", () => {
		expect(timezoneSchema.safeParse("Not/AZone").success).toBe(false);
	});
});

describe("localeSchema", () => {
	it.each(["en_US", "de_DE", "en"])("accepts %s", (value) => {
		expect(localeSchema.parse(value)).toBe(value);
	});

	it("rejects garbage locales", () => {
		expect(localeSchema.safeParse("!!!").success).toBe(false);
	});
});

describe("extension and MIME lists", () => {
	it("accepts a normalizable extension list", () => {
		expect(extensionsCsvSchema.safeParse(".PNG, .jpg, gif").success).toBe(true);
	});

	it("rejects traversal-style extensions", () => {
		expect(extensionsCsvSchema.safeParse("../png").success).toBe(false);
	});

	it("accepts null (defaults apply)", () => {
		expect(extensionsCsvSchema.safeParse(null).success).toBe(true);
	});

	it("accepts a valid MIME list and rejects invalid ones", () => {
		expect(mimeTypesCsvSchema.safeParse("image/png, video/mp4").success).toBe(true);
		expect(mimeTypesCsvSchema.safeParse("not-a-mime").success).toBe(false);
	});

	it("refuses an extension Snapshot does not store", () => {
		const result = extensionsCsvSchema.safeParse(".png, .txt, .pdf");

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toContain(".pdf, .txt");
	});

	it("refuses a MIME type that is not a media type", () => {
		const result = mimeTypesCsvSchema.safeParse("image/png, text/plain");

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toContain("text/plain");
	});

	it("reports the malformed entry rather than the media rule when both are wrong", () => {
		const result = extensionsCsvSchema.safeParse("../png, .txt");

		expect(result.success).toBe(false);
		expect(result.error?.issues).toHaveLength(1);
		expect(result.error?.issues[0]?.message).toContain("invalid entries");
	});
});

describe("apiKeySchema", () => {
	it("trims surrounding whitespace", () => {
		expect(apiKeySchema.parse(`  ${"y".repeat(40)}  `)).toBe("y".repeat(40));
	});

	it("rejects keys that fall below the minimum after trimming", () => {
		expect(apiKeySchema.safeParse(`${"z".repeat(30)}  `).success).toBe(false);
	});
});

describe("runtimeConfigSchema", () => {
	it("parses a complete valid config", () => {
		expect(runtimeConfigSchema.parse(validConfig)).toMatchObject({ apiKey: "x".repeat(48) });
	});

	it("rejects invalid nested values", () => {
		expect(runtimeConfigSchema.safeParse({ ...validConfig, embedThemeColor: "notacolor" }).success).toBe(false);
	});
});

describe("configViewSchema", () => {
	it("accepts a masked api key that the runtime schema would reject", () => {
		const masked = { ...validConfig, apiKey: "••••••••wxyz" };

		expect(runtimeConfigSchema.safeParse(masked).success).toBe(false);
		expect(configViewSchema.safeParse(masked).success).toBe(true);
	});
});

describe("runtimeConfigSchema id rules", () => {
	it("rejects a length too short for the characters it must contain", () => {
		const result = runtimeConfigSchema.safeParse({
			...validConfig,
			linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "digits", "symbols"] },
			linkIdMinDigits: 4,
			linkIdMinSymbols: 4,
			linkIdLength: 7,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("linkIdLength");
	});

	it("ignores a minimum whose class the alphabet does not contain", () => {
		expect(
			runtimeConfigSchema.safeParse({
				...validConfig,
				linkIdAlphabet: { mode: "charsets", charsets: ["lowercase"] },
				linkIdMinDigits: 16,
				linkIdMinSymbols: 16,
				linkIdLength: 3,
			}).success,
		).toBe(true);
	});
});

describe("configUpdateSchema", () => {
	it("accepts a partial update", () => {
		expect(configUpdateSchema.parse({ embedProviderName: "Acme" })).toEqual({
			embedProviderName: "Acme",
		});
	});

	it("rejects api key changes (rotate endpoint only)", () => {
		expect(configUpdateSchema.safeParse({ apiKey: "k".repeat(48) }).success).toBe(false);
	});

	it("rejects unknown fields", () => {
		expect(configUpdateSchema.safeParse({ doesNotExist: 1 }).success).toBe(false);
	});
});

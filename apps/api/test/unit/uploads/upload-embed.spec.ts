import type { RuntimeConfig } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";
import { buildPublicEmbed } from "../../../src/modules/uploads/upload-embed.js";
import type { CachedUpload } from "../../../src/redis/cache.service.js";

const meta: CachedUpload = {
	id: "abc123XYZ9",
	extension: "png",
	mimeType: "image/png",
	sizeBytes: 2_085_888,
	checksumSha256: "a".repeat(64),
	width: 1920,
	height: 1080,
	hasThumbnail: false,
	createdAt: "2026-07-07T16:58:59.000Z",
};

function configWith(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
	return {
		apiKey: "k".repeat(32),
		maxFileSizeBytes: 52_428_800,
		maxTotalStorageBytes: null,
		uploadIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
		uploadIdMinDigits: 2,
		uploadIdMinSymbols: 2,
		linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
		linkIdMinDigits: 2,
		linkIdMinSymbols: 2,
		uploadIdLength: 10,
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
		...overrides,
	};
}

describe("buildPublicEmbed", () => {
	it("fills the templates from the upload and the live config", () => {
		const embed = buildPublicEmbed(meta, configWith());

		expect(embed).toEqual({
			enabled: true,
			providerName: "Snapshot",
			themeColor: "#5865F2",
			title: "abc123XYZ9.png",
			description: "2.0 MB | 7/7/2026, 4:58:59 PM",
			locale: "en_US",
		});
	});

	it("exposes every template variable", () => {
		const embed = buildPublicEmbed(meta, configWith({ embedTitleTemplate: "{id} {extension} {content_type} {size} {provider}" }));

		expect(embed.title).toBe("abc123XYZ9 png image/png 2085888 Snapshot");
	});

	it("keeps an unknown placeholder verbatim instead of throwing", () => {
		const embed = buildPublicEmbed(meta, configWith({ embedTitleTemplate: "{nope}" }));

		expect(embed.title).toBe("{nope}");
	});

	it("carries the disabled flag through", () => {
		expect(buildPublicEmbed(meta, configWith({ embedEnabled: false })).enabled).toBe(false);
	});
});

import { describe, expect, it } from "vitest";

import { maskApiKey, toConfigView } from "../../../src/modules/config/config.mapper.js";
import { defaultRuntimeConfig } from "../../../src/modules/runtime-config/runtime-config.defaults.js";

describe("maskApiKey", () => {
	it("reveals only the last four characters", () => {
		expect(maskApiKey("abcdefghijklmnopqrstuvwxyz1234")).toBe("••••••••1234");
	});

	it("never exposes the leading characters", () => {
		const masked = maskApiKey("SUPERSECRETKEY000000000000000wxyz");

		expect(masked).not.toContain("SUPERSECRET");
		expect(masked.endsWith("wxyz")).toBe(true);
	});
});

describe("toConfigView", () => {
	it("masks the api key and preserves every other field", () => {
		const config = { ...defaultRuntimeConfig(), apiKey: `${"x".repeat(40)}ABCD` };
		const view = toConfigView(config);

		expect(view.apiKey).toBe("••••••••ABCD");
		expect(view.embedProviderName).toBe(config.embedProviderName);
		expect(view.maxFileSizeBytes).toBe(config.maxFileSizeBytes);
	});
});

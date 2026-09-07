import { describe, expect, it } from "vitest";

import { isRedactedKey, sanitizeAuditMetadata } from "../../../src/modules/audit/audit-metadata.js";

describe("isRedactedKey", () => {
	it.each(["password", "currentPassword", "apiKey", "api_key", "API-KEY", "totpSecret", "recoveryCodes", "authorization", "cookie"])(
		"redacts %s",
		(key) => {
			expect(isRedactedKey(key)).toBe(true);
		},
	);

	it.each(["changed", "changedKeys", "extension", "sizeBytes", "host", "retentionDays"])("keeps %s", (key) => {
		expect(isRedactedKey(key)).toBe(false);
	});
});

describe("sanitizeAuditMetadata", () => {
	it("passes primitives through", () => {
		expect(sanitizeAuditMetadata({ extension: "png", sizeBytes: 1024, ok: true, missing: null })).toEqual({
			extension: "png",
			sizeBytes: 1024,
			ok: true,
			missing: null,
		});
	});

	it("replaces a secret-looking value rather than dropping the key", () => {
		expect(sanitizeAuditMetadata({ apiKey: "super-secret" })).toEqual({ apiKey: "[redacted]" });
	});

	it("keeps a list of changed config keys", () => {
		expect(sanitizeAuditMetadata({ changed: ["embedEnabled", "maxFileSizeBytes"] })).toEqual({
			changed: ["embedEnabled", "maxFileSizeBytes"],
		});
	});

	it("serializes a nested object rather than losing the change it describes", () => {
		expect(sanitizeAuditMetadata({ uploadIdAlphabet: { mode: "charsets", charsets: ["lowercase"] } })).toEqual({
			uploadIdAlphabet: '{"mode":"charsets","charsets":["lowercase"]}',
		});
	});

	it("truncates a string beyond the cap", () => {
		const result = sanitizeAuditMetadata({ path: "x".repeat(2000) }) as { path: string };

		expect(result.path).toHaveLength(1025);
		expect(result.path.endsWith("…")).toBe(true);
	});

	it("keeps a full-length destination URL", () => {
		const url = `https://example.com/${"a".repeat(400)}`;

		expect(sanitizeAuditMetadata({ target: url })).toEqual({ target: url });
	});

	it("caps how many keys survive", () => {
		const wide = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`key${index}`, index]));

		expect(Object.keys(sanitizeAuditMetadata(wide) ?? {})).toHaveLength(24);
	});

	it("drops a non-finite number", () => {
		expect(sanitizeAuditMetadata({ ratio: Number.NaN })).toEqual({ ratio: null });
	});

	it("returns null for nothing usable", () => {
		expect(sanitizeAuditMetadata(null)).toBeNull();
		expect(sanitizeAuditMetadata(undefined)).toBeNull();
		expect(sanitizeAuditMetadata({})).toBeNull();
		expect(sanitizeAuditMetadata({ handler: () => true })).toBeNull();
	});
});

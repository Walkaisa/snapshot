import { describe, expect, it } from "vitest";

import { decryptSecret, deriveSecretKey, encryptSecret } from "../../../src/modules/auth/secret-cipher.js";

const SESSION_SECRET = "a-session-secret-long-enough-for-production";
const OTHER_SECRET = "a-different-session-secret-entirely-here";
const PLAINTEXT = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("deriveSecretKey", () => {
	it("is deterministic per session secret", () => {
		expect(deriveSecretKey(SESSION_SECRET)).toEqual(deriveSecretKey(SESSION_SECRET));
	});

	it("produces a 256-bit key", () => {
		expect(deriveSecretKey(SESSION_SECRET)).toHaveLength(32);
	});

	it("differs for a different session secret", () => {
		expect(deriveSecretKey(SESSION_SECRET)).not.toEqual(deriveSecretKey(OTHER_SECRET));
	});
});

describe("encryptSecret", () => {
	it("round-trips through decryptSecret", () => {
		const key = deriveSecretKey(SESSION_SECRET);

		expect(decryptSecret(encryptSecret(PLAINTEXT, key), key)).toBe(PLAINTEXT);
	});

	it("never stores the plaintext", () => {
		const encoded = encryptSecret(PLAINTEXT, deriveSecretKey(SESSION_SECRET));

		expect(encoded).not.toContain(PLAINTEXT);
		expect(encoded.startsWith("v1.")).toBe(true);
	});

	it("uses a fresh nonce for every call", () => {
		const key = deriveSecretKey(SESSION_SECRET);

		expect(encryptSecret(PLAINTEXT, key)).not.toBe(encryptSecret(PLAINTEXT, key));
	});
});

describe("decryptSecret", () => {
	it("returns null for a ciphertext from another session secret", () => {
		const encoded = encryptSecret(PLAINTEXT, deriveSecretKey(SESSION_SECRET));

		expect(decryptSecret(encoded, deriveSecretKey(OTHER_SECRET))).toBeNull();
	});

	it.each([1, 2, 3])("returns null when segment %i was tampered with", (index) => {
		const key = deriveSecretKey(SESSION_SECRET);
		const segments = encryptSecret(PLAINTEXT, key).split(".");
		const decoded = Buffer.from(segments[index] ?? "", "base64url");
		decoded[0] = (decoded[0] ?? 0) ^ 0xff;
		segments[index] = decoded.toString("base64url");

		expect(decryptSecret(segments.join("."), key)).toBeNull();
	});

	it.each(["", "v1", "v1.a.b", "v2.a.b.c", "not-encrypted-at-all"])("returns null for the malformed payload %j", (encoded) => {
		expect(decryptSecret(encoded, deriveSecretKey(SESSION_SECRET))).toBeNull();
	});
});

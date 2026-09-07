import { describe, expect, it } from "vitest";

import { AppConfigService } from "../../../src/config/app-config.service.js";
import { PasswordHasher } from "../../../src/modules/auth/password-hasher.service.js";

const hasher = new PasswordHasher(new AppConfigService());

describe("PasswordHasher", () => {
	it("produces an argon2id hash", async () => {
		const encoded = await hasher.hash("correct horse battery staple");

		expect(encoded.startsWith("$argon2id$")).toBe(true);
	});

	it("verifies the right password and rejects a wrong one", async () => {
		const encoded = await hasher.hash("correct horse battery staple");

		expect(await hasher.verify(encoded, "correct horse battery staple")).toBe(true);
		expect(await hasher.verify(encoded, "wrong password entirely")).toBe(false);
	});

	it("returns false for a malformed hash instead of throwing", async () => {
		expect(await hasher.verify("not-a-real-hash", "whatever")).toBe(false);
	});

	it("does not flag a freshly created hash for rehash", async () => {
		const encoded = await hasher.hash("correct horse battery staple");

		expect(hasher.needsRehash(encoded)).toBe(false);
	});

	it("flags a hash built with different cost parameters", () => {
		const stronger = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaGhhc2hoYXNo";

		expect(hasher.needsRehash(stronger)).toBe(true);
	});

	it("flags an unparseable hash for rehash", () => {
		expect(hasher.needsRehash("$argon2i$v=19$broken")).toBe(true);
	});
});

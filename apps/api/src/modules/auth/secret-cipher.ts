import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = "v1";
const HKDF_SALT = "snapshot:mfa";
const HKDF_INFO = "totp-secret";

export function deriveSecretKey(sessionSecret: string): Buffer {
	return Buffer.from(hkdfSync("sha256", Buffer.from(sessionSecret, "utf8"), HKDF_SALT, HKDF_INFO, KEY_BYTES));
}

export function encryptSecret(plaintext: string, key: Buffer): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

	return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(encoded: string, key: Buffer): string | null {
	const [version, iv, tag, ciphertext] = encoded.split(".");

	if (version !== VERSION || iv === undefined || tag === undefined || ciphertext === undefined) {
		return null;
	}

	try {
		const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
		decipher.setAuthTag(Buffer.from(tag, "base64url"));

		return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
	} catch {
		return null;
	}
}

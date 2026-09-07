import { randomBytes } from "node:crypto";
import { type IdAlphabet, isMediaExtension, isMediaMimeType, normalizeExtension, parseCsv, type RuntimeConfig } from "@snapshot/contracts";

const API_KEY_BYTES = 32;
const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_AUDIT_RETENTION_DAYS = 90;

const DEFAULT_ID_ALPHABET: IdAlphabet = { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] };
const DEFAULT_ID_LENGTH = 10;
const DEFAULT_ID_MIN_OCCURRENCE = 2;

const SHARED_ID_KEYS = {
	idAlphabet: ["uploadIdAlphabet", "linkIdAlphabet"],
	idMinDigits: ["uploadIdMinDigits", "linkIdMinDigits"],
	idMinSymbols: ["uploadIdMinSymbols", "linkIdMinSymbols"],
} as const;

export const SHARED_ID_CONFIG_KEYS = Object.keys(SHARED_ID_KEYS);

export function splitSharedIdConfig(stored: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(SHARED_ID_KEYS).flatMap(([shared, targets]) =>
			shared in stored ? targets.filter((target) => !(target in stored)).map((target) => [target, stored[shared]]) : [],
		),
	);
}

const MEDIA_ONLY_CONFIG_KEYS = ["allowedExtensions", "allowedMimeTypes"] as const;

function keepMediaEntries(value: unknown, keep: (entry: string) => boolean): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const kept = parseCsv(value).filter((entry) => keep(entry));

	return kept.length > 0 ? kept.join(", ") : null;
}

export function narrowToMediaConfig(stored: Record<string, unknown>): Record<string, unknown> {
	const narrowed: Record<string, unknown> = {};

	for (const key of MEDIA_ONLY_CONFIG_KEYS) {
		if (!(key in stored)) {
			continue;
		}

		const keep =
			key === "allowedExtensions"
				? (entry: string) => isMediaExtension(normalizeExtension(entry))
				: (entry: string) => isMediaMimeType(entry);
		const next = keepMediaEntries(stored[key], keep);

		if (next !== stored[key]) {
			narrowed[key] = next;
		}
	}

	return narrowed;
}

export function generateApiKey(): string {
	return randomBytes(API_KEY_BYTES).toString("base64url");
}

export function defaultRuntimeConfig(): RuntimeConfig {
	return {
		apiKey: generateApiKey(),
		maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
		maxTotalStorageBytes: null,
		uploadIdAlphabet: DEFAULT_ID_ALPHABET,
		uploadIdMinDigits: DEFAULT_ID_MIN_OCCURRENCE,
		uploadIdMinSymbols: DEFAULT_ID_MIN_OCCURRENCE,
		uploadIdLength: DEFAULT_ID_LENGTH,
		linkIdAlphabet: DEFAULT_ID_ALPHABET,
		linkIdMinDigits: DEFAULT_ID_MIN_OCCURRENCE,
		linkIdMinSymbols: DEFAULT_ID_MIN_OCCURRENCE,
		linkIdLength: DEFAULT_ID_LENGTH,
		allowedExtensions: null,
		allowedMimeTypes: null,
		auditRetentionDays: DEFAULT_AUDIT_RETENTION_DAYS,
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
}

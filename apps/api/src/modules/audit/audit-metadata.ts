import { AUDIT_METADATA_MAX_KEYS } from "@snapshot/contracts";

const REDACTED_FRAGMENTS = ["password", "secret", "token", "apikey", "credential", "recoverycode", "totp", "cookie", "authorization"];

const MAX_STRING_LENGTH = 1024;
const MAX_ARRAY_LENGTH = 32;

function normalizeKey(key: string): string {
	return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function isRedactedKey(key: string): boolean {
	const normalized = normalizeKey(key);

	return REDACTED_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function sanitizeValue(value: unknown): unknown {
	if (typeof value === "string") {
		return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
	}

	if (typeof value === "boolean" || value === null) {
		return value;
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	if (Array.isArray(value)) {
		return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item));
	}

	if (typeof value === "object") {
		return sanitizeValue(JSON.stringify(value));
	}

	return undefined;
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
	if (metadata === null || metadata === undefined) {
		return null;
	}

	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(metadata)) {
		if (Object.keys(sanitized).length >= AUDIT_METADATA_MAX_KEYS) {
			break;
		}

		if (isRedactedKey(key)) {
			sanitized[key] = "[redacted]";
			continue;
		}

		const clean = sanitizeValue(value);

		if (clean !== undefined) {
			sanitized[key] = clean;
		}
	}

	return Object.keys(sanitized).length > 0 ? sanitized : null;
}

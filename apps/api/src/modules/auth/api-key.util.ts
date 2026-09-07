import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const BEARER_PREFIX = "Bearer ";

export function extractApiKey(request: Request): string | null {
	const authorization = request.get("authorization");

	if (authorization?.startsWith(BEARER_PREFIX)) {
		return authorization.slice(BEARER_PREFIX.length).trim() || null;
	}

	return request.get("x-api-key")?.trim() || null;
}

export function apiKeyMatches(provided: string | null, expected: string): boolean {
	if (!provided) {
		return false;
	}

	const providedDigest = createHash("sha256").update(provided).digest();
	const expectedDigest = createHash("sha256").update(expected).digest();

	return timingSafeEqual(providedDigest, expectedDigest);
}

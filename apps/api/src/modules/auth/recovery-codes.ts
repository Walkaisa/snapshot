import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { RECOVERY_CODE_COUNT } from "@snapshot/contracts";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUP_LENGTH = 5;

function group(): string {
	let value = "";

	for (let index = 0; index < GROUP_LENGTH; index += 1) {
		value += ALPHABET[randomInt(ALPHABET.length)];
	}

	return value;
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
	return Array.from({ length: count }, () => `${group()}-${group()}`);
}

export function normalizeRecoveryCode(value: string): string {
	return value.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(value: string): string {
	return createHash("sha256").update(normalizeRecoveryCode(value)).digest("hex");
}

export function recoveryCodeMatches(candidateHash: string, storedHash: string): boolean {
	const candidate = Buffer.from(candidateHash, "hex");
	const stored = Buffer.from(storedHash, "hex");

	if (candidate.length !== stored.length || candidate.length === 0) {
		return false;
	}

	return timingSafeEqual(candidate, stored);
}

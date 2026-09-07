import { PASSWORD_MIN_LENGTH } from "@snapshot/contracts";

export const PASSWORD_REQUIREMENTS = ["length", "lowercase", "uppercase", "number", "symbol"] as const;

export type PasswordRequirement = (typeof PASSWORD_REQUIREMENTS)[number];

export type PasswordChecks = Record<PasswordRequirement, boolean>;

export function evaluatePassword(password: string): PasswordChecks {
	return {
		length: password.length >= PASSWORD_MIN_LENGTH,
		lowercase: /[a-z]/.test(password),
		uppercase: /[A-Z]/.test(password),
		number: /\d/.test(password),
		symbol: /[^A-Za-z0-9]/.test(password),
	};
}

export type PasswordLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
	score: number;
	level: PasswordLevel;
}

export function passwordStrength(password: string): PasswordStrength {
	if (password.length === 0) {
		return { score: 0, level: "weak" };
	}

	const met = Object.values(evaluatePassword(password)).filter(Boolean).length;
	const level: PasswordLevel = met <= 1 ? "weak" : met === 2 ? "fair" : met === 3 ? "good" : "strong";

	return { score: met, level };
}

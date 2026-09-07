import { TOTP_DIGITS, TOTP_PERIOD_SECONDS } from "@snapshot/contracts";
import { Secret, TOTP } from "otpauth";

const SECRET_BYTES = 20;
const VALIDATION_WINDOW = 1;

export const TOTP_REPLAY_TTL_SECONDS = TOTP_PERIOD_SECONDS * (2 * VALIDATION_WINDOW + 2);

export interface TotpMatch {
	counter: number;
}

function totpFor(secret: string, issuer: string, label: string): TOTP {
	return new TOTP({
		issuer,
		label,
		algorithm: "SHA1",
		digits: TOTP_DIGITS,
		period: TOTP_PERIOD_SECONDS,
		secret: Secret.fromBase32(secret),
	});
}

export function generateTotpSecret(): string {
	return new Secret({ size: SECRET_BYTES }).base32;
}

export function totpUri(secret: string, issuer: string, account: string): string {
	return totpFor(secret, issuer, account).toString();
}

export function matchTotp(secret: string, token: string, now = Date.now()): TotpMatch | null {
	let delta: number | null;

	try {
		delta = totpFor(secret, "Snapshot", "account").validate({ token, window: VALIDATION_WINDOW, timestamp: now });
	} catch {
		return null;
	}

	if (delta === null) {
		return null;
	}

	return { counter: Math.floor(now / 1000 / TOTP_PERIOD_SECONDS) + delta };
}

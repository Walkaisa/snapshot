export const SESSION_REDIS = Symbol("SESSION_REDIS");
export const SESSION_STORE = Symbol("SESSION_STORE");
export const CSRF = Symbol("CSRF");

export const SESSION_STORE_PREFIX = "snapshot:sess:";
export const CSRF_HEADER = "x-csrf-token";

export const AUTH_THROTTLE_TTL_MS = 60_000;
export const AUTH_SUSTAINED_THROTTLE_TTL_MS = 60 * 60_000;
export const AUTH_THROTTLE_BLOCK_MS = 60_000;
export const AUTH_SUSTAINED_THROTTLE_BLOCK_MS = 15 * 60_000;
export const LOGIN_ATTEMPT_LIMIT = 10;
export const SETUP_ATTEMPT_LIMIT = 5;
export const MFA_ATTEMPT_LIMIT = 10;
export const REAUTHENTICATION_ATTEMPT_LIMIT = 5;
export const MFA_CHALLENGE_TTL_MS = 5 * 60_000;

export const AUTH_IP_THROTTLER = "auth-ip";
export const AUTH_SUSTAINED_THROTTLER = "auth-sustained";

const SESSION_COOKIE_NAME_PROD = "__Host-snapshot.sid";
const SESSION_COOKIE_NAME_DEV = "snapshot.sid";

export function sessionCookieName(isProduction: boolean): string {
	return isProduction ? SESSION_COOKIE_NAME_PROD : SESSION_COOKIE_NAME_DEV;
}

export function adminSessionsKey(adminId: string): string {
	return `snapshot:admin_sessions:${adminId}`;
}

import type {
	AuthState,
	LoginRequest,
	MfaVerifyRequest,
	PasswordChangeRequest,
	RevokeData,
	SessionData,
	SessionList,
	SessionRevokeRequest,
	SetupRequest,
	SignInResult,
} from "@snapshot/contracts";

import { clientApi, resetCsrfToken, setCsrfToken } from "./client";

export function fetchAuthState(): Promise<AuthState> {
	return clientApi<AuthState>("/api/auth/state");
}

export async function fetchSession(): Promise<SessionData> {
	const session = await clientApi<SessionData>("/api/auth/session");
	setCsrfToken(session.csrfToken);

	return session;
}

export async function setupAdmin(input: SetupRequest): Promise<SessionData> {
	const session = await clientApi<SessionData>("/api/auth/setup", { method: "POST", body: JSON.stringify(input) });
	setCsrfToken(session.csrfToken);

	return session;
}

export async function signIn(input: LoginRequest): Promise<SignInResult> {
	const result = await clientApi<SignInResult>("/api/auth/sign-in", {
		method: "POST",
		body: JSON.stringify(input),
	});
	setCsrfToken(result.csrfToken);

	return result;
}

export async function verifySignInMfa(input: MfaVerifyRequest): Promise<SessionData> {
	const session = await clientApi<SessionData>("/api/auth/sign-in/mfa", {
		method: "POST",
		body: JSON.stringify(input),
	});
	setCsrfToken(session.csrfToken);

	return session;
}

export async function signOut(): Promise<void> {
	await clientApi<null>("/api/auth/sign-out", { method: "POST" });
	resetCsrfToken();
}

export async function changePassword(input: PasswordChangeRequest): Promise<SessionData> {
	const session = await clientApi<SessionData>("/api/auth/change-password", {
		method: "POST",
		body: JSON.stringify(input),
	});
	resetCsrfToken();
	return session;
}

export function fetchSessions(): Promise<SessionList> {
	return clientApi<SessionList>("/api/auth/sessions");
}

export function revokeSessions(input: SessionRevokeRequest = {}): Promise<RevokeData> {
	return clientApi<RevokeData>("/api/auth/sessions/revoke", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

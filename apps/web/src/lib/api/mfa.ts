import type {
	MfaDisableRequest,
	MfaStatus,
	PasswordConfirmRequest,
	RecoveryCodes,
	RecoveryCodesRegenerateRequest,
	TotpEnableRequest,
	TotpEnrollment,
} from "@snapshot/contracts";

import { clientApi, resetCsrfToken } from "./client";

export function fetchMfaStatus(): Promise<MfaStatus> {
	return clientApi<MfaStatus>("/api/auth/mfa");
}

export function beginMfaSetup(input: PasswordConfirmRequest): Promise<TotpEnrollment> {
	return clientApi<TotpEnrollment>("/api/auth/mfa/setup", { method: "POST", body: JSON.stringify(input) });
}

export async function cancelMfaSetup(): Promise<void> {
	await clientApi<null>("/api/auth/mfa/setup", { method: "DELETE" });
}

export async function enableMfa(input: TotpEnableRequest): Promise<RecoveryCodes> {
	const result = await clientApi<RecoveryCodes>("/api/auth/mfa/enable", { method: "POST", body: JSON.stringify(input) });
	resetCsrfToken();

	return result;
}

export async function disableMfa(input: MfaDisableRequest): Promise<void> {
	await clientApi<null>("/api/auth/mfa/disable", { method: "POST", body: JSON.stringify(input) });
	resetCsrfToken();
}

export async function regenerateRecoveryCodes(input: RecoveryCodesRegenerateRequest): Promise<RecoveryCodes> {
	const result = await clientApi<RecoveryCodes>("/api/auth/mfa/recovery-codes", { method: "POST", body: JSON.stringify(input) });
	resetCsrfToken();

	return result;
}

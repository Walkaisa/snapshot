import type { AccountView, PreferencesUpdate, UsernameChangeRequest } from "@snapshot/contracts";

import { clientApi } from "./client";

export function changeUsername(input: UsernameChangeRequest): Promise<AccountView> {
	return clientApi<AccountView>("/api/account/username", { method: "PATCH", body: JSON.stringify(input) });
}

export function updatePreferences(input: PreferencesUpdate): Promise<AccountView> {
	return clientApi<AccountView>("/api/account/preferences", { method: "PATCH", body: JSON.stringify(input) });
}

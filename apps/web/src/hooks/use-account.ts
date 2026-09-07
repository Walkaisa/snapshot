"use client";

import type { AccountView, PreferencesUpdate, SessionData, UsernameChangeRequest } from "@snapshot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { changeUsername, updatePreferences } from "@/lib/api/account";
import { fetchSession } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

export function useSession() {
	return useQuery({ queryKey: queryKeys.session, queryFn: fetchSession });
}

function useAccountUpdate<TInput>(mutationFn: (input: TInput) => Promise<AccountView>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: (view: AccountView) => {
			queryClient.setQueryData<SessionData>(queryKeys.session, (old) => (old ? { ...old, ...view } : old));
		},
	});
}

export function useChangeUsername() {
	return useAccountUpdate<UsernameChangeRequest>(changeUsername);
}

export function useUpdatePreferences() {
	return useAccountUpdate<PreferencesUpdate>(updatePreferences);
}

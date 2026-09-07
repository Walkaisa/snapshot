"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { beginMfaSetup, cancelMfaSetup, disableMfa, enableMfa, fetchMfaStatus, regenerateRecoveryCodes } from "@/lib/api/mfa";
import { queryKeys } from "@/lib/query-keys";

export function useMfaStatus() {
	return useQuery({ queryKey: queryKeys.mfa, queryFn: fetchMfaStatus });
}

function useMfaMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mfa }),
	});
}

export function useBeginMfaSetup() {
	return useMfaMutation(beginMfaSetup);
}

export function useCancelMfaSetup() {
	return useMfaMutation(() => cancelMfaSetup());
}

export function useEnableMfa() {
	return useMfaMutation(enableMfa);
}

export function useDisableMfa() {
	return useMfaMutation(disableMfa);
}

export function useRegenerateRecoveryCodes() {
	return useMfaMutation(regenerateRecoveryCodes);
}

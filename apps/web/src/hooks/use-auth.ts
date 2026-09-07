"use client";

import type { SessionData, SignInResult } from "@snapshot/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setupAdmin, signIn, signOut, verifySignInMfa } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

export function useSetup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: setupAdmin,
		onSuccess: (session: SessionData) => {
			queryClient.setQueryData(queryKeys.session, session);
			void queryClient.invalidateQueries({ queryKey: queryKeys.authState });
		},
	});
}

export function useSignIn() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: signIn,
		onSuccess: (result: SignInResult) => {
			if (result.mfaRequired) {
				return;
			}

			queryClient.setQueryData(queryKeys.session, result);
			void queryClient.invalidateQueries({ queryKey: queryKeys.authState });
		},
	});
}

export function useVerifySignInMfa() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: verifySignInMfa,
		onSuccess: (session: SessionData) => {
			queryClient.setQueryData(queryKeys.session, session);
			void queryClient.invalidateQueries({ queryKey: queryKeys.authState });
		},
	});
}

export function useSignOut() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: signOut,
		onSuccess: () => queryClient.clear(),
	});
}

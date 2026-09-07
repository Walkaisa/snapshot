"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { changePassword, fetchSessions, revokeSessions } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

export function useSessions() {
	return useQuery({ queryKey: queryKeys.sessions, queryFn: fetchSessions });
}

function invalidateSessionScopes(queryClient: ReturnType<typeof useQueryClient>): void {
	void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
	void queryClient.invalidateQueries({ queryKey: queryKeys.statsOverview });
}

export function useChangePassword() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: changePassword,
		onSuccess: () => invalidateSessionScopes(queryClient),
	});
}

export function useRevokeSessions() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: revokeSessions,
		onSuccess: () => invalidateSessionScopes(queryClient),
	});
}

"use client";

import type { ApiKeyData, ConfigView } from "@snapshot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revealApiKey, rotateApiKey, updateConfig } from "@/lib/api/config";
import { queryKeys } from "@/lib/query-keys";

export function useUpdateConfig() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateConfig,
		onSuccess: (config: ConfigView) => queryClient.setQueryData(queryKeys.config, config),
	});
}

export function useApiKeyReveal() {
	return useQuery({ queryKey: queryKeys.apiKey, queryFn: revealApiKey, enabled: false });
}

export function useRotateApiKey() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: rotateApiKey,
		onSuccess: (data: ApiKeyData) => {
			queryClient.setQueryData(queryKeys.apiKey, data);
			void queryClient.invalidateQueries({ queryKey: queryKeys.config });
		},
	});
}

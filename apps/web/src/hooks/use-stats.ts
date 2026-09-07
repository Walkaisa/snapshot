"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchActivity, fetchStorageBreakdown } from "@/lib/api/stats";
import { queryKeys } from "@/lib/query-keys";

export function useActivity(days: number) {
	return useQuery({
		queryKey: queryKeys.statsActivity(days),
		queryFn: () => fetchActivity(days),
		placeholderData: (previous) => previous,
	});
}

export function useStorageBreakdown() {
	return useQuery({ queryKey: queryKeys.statsBreakdown, queryFn: fetchStorageBreakdown });
}

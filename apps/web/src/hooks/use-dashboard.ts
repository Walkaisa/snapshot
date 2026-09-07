"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConfigView, fetchOverview, fetchRecentLinks, fetchRecentUploads, RECENT_LIMIT } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query-keys";

export function useOverview() {
	return useQuery({ queryKey: queryKeys.statsOverview, queryFn: fetchOverview });
}

export function useRecentUploads() {
	return useQuery({
		queryKey: queryKeys.uploads(1, RECENT_LIMIT),
		queryFn: fetchRecentUploads,
	});
}

export function useRecentLinks() {
	return useQuery({
		queryKey: queryKeys.links(1, RECENT_LIMIT),
		queryFn: fetchRecentLinks,
	});
}

export function useConfigView() {
	return useQuery({ queryKey: queryKeys.config, queryFn: fetchConfigView });
}

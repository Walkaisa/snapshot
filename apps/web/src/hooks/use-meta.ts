"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMeta } from "@/lib/api/meta";
import { queryKeys } from "@/lib/query-keys";

const VERSION_POLL_INTERVAL_MS = 30 * 60_000;

export function useMeta() {
	return useQuery({ queryKey: queryKeys.meta, queryFn: fetchMeta, refetchInterval: VERSION_POLL_INTERVAL_MS });
}

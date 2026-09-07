"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchIdAvailability } from "@/lib/api/ids";
import { queryKeys } from "@/lib/query-keys";

export function useIdAvailability(id: string) {
	return useQuery({
		queryKey: queryKeys.idAvailability(id),
		queryFn: () => fetchIdAvailability(id),
		enabled: id.length > 0,
		staleTime: 10_000,
		retry: false,
	});
}

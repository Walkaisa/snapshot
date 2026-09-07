"use client";

import type { AuditPage } from "@snapshot/contracts";
import { AUDIT_PAGE_SIZE } from "@snapshot/contracts";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { type AuditFilters, fetchAuditPage, fetchAuditSummary } from "@/lib/api/audit";
import { queryKeys } from "@/lib/query-keys";

export function useInfiniteAudit(filters: AuditFilters) {
	return useInfiniteQuery({
		queryKey: queryKeys.auditInfinite(filters),
		queryFn: ({ pageParam }) => fetchAuditPage(filters, pageParam),
		initialPageParam: 1,
		getNextPageParam: (lastPage: AuditPage) => {
			const loaded = lastPage.page * lastPage.perPage;

			return loaded < lastPage.total ? lastPage.page + 1 : undefined;
		},
		placeholderData: keepPreviousData,
	});
}

export function useAuditSummary(filters: AuditFilters) {
	return useQuery({
		queryKey: queryKeys.auditSummary(filters),
		queryFn: () => fetchAuditSummary(filters),
		placeholderData: keepPreviousData,
	});
}

export { AUDIT_PAGE_SIZE };

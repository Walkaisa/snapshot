import type { AuditPage as AuditPageData, AuditSummary } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { AuditView } from "@/components/audit/audit-view";
import { auditPagePath, auditSummaryPath, EMPTY_AUDIT_FILTERS } from "@/lib/api/audit";
import { serverApi } from "@/lib/api/server";
import { DEFAULT_AUDIT_RANGE_HOURS } from "@/lib/audit-range";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function AuditPage() {
	const queryClient = getQueryClient();
	const from = new Date(Date.now() - DEFAULT_AUDIT_RANGE_HOURS * 60 * 60 * 1000).toISOString();
	const filters = { ...EMPTY_AUDIT_FILTERS, from };

	await Promise.all([
		queryClient.prefetchInfiniteQuery({
			queryKey: queryKeys.auditInfinite(filters),
			queryFn: ({ pageParam }) => serverApi<AuditPageData>(auditPagePath(filters, pageParam)),
			initialPageParam: 1,
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.auditSummary(filters),
			queryFn: () => serverApi<AuditSummary>(auditSummaryPath(filters)),
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<AuditView initialFrom={from} />
		</HydrationBoundary>
	);
}

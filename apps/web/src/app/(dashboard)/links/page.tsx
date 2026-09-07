import type { LinkList } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { LinksView } from "@/components/links/links-view";
import { LINKS_PAGE_SIZE, linkListPath } from "@/lib/api/links";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { publicBaseUrl } from "@/lib/public-base-url";
import { queryKeys } from "@/lib/query-keys";

export default async function LinksPage() {
	const queryClient = getQueryClient();

	const params = { sort: "createdAt", order: "desc", search: "" } as const;

	await queryClient.prefetchInfiniteQuery({
		queryKey: queryKeys.linksInfinite(LINKS_PAGE_SIZE, params.sort, params.order, params.search),
		queryFn: ({ pageParam }) => serverApi<LinkList>(linkListPath(pageParam, LINKS_PAGE_SIZE, params)),
		initialPageParam: 1,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LinksView baseUrl={publicBaseUrl()} />
		</HydrationBoundary>
	);
}

import type { ConfigView } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ApiKeyCard } from "@/components/settings/api-key-card";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function ApiKeyPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.config,
		queryFn: () => serverApi<ConfigView>("/api/config"),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ApiKeyCard />
		</HydrationBoundary>
	);
}

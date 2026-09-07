import type { ConfigView } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { RateLimitSettings } from "@/components/settings/rate-limit-settings-form";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function RateLimitPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.config,
		queryFn: () => serverApi<ConfigView>("/api/config"),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<RateLimitSettings />
		</HydrationBoundary>
	);
}

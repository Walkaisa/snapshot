import type { ConfigView } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ShortenerSettings } from "@/components/settings/shortener-settings-form";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function ShortenerPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.config,
		queryFn: () => serverApi<ConfigView>("/api/config"),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ShortenerSettings />
		</HydrationBoundary>
	);
}

import type { ConfigView, UploadList } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { GalleryView } from "@/components/gallery/gallery-view";
import { GALLERY_PAGE_SIZE } from "@/lib/api/gallery";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { publicBaseUrl } from "@/lib/public-base-url";
import { queryKeys } from "@/lib/query-keys";

export default async function GalleryPage() {
	const queryClient = getQueryClient();

	await Promise.all([
		queryClient.prefetchInfiniteQuery({
			queryKey: queryKeys.uploadsInfinite(GALLERY_PAGE_SIZE),
			queryFn: ({ pageParam }) => serverApi<UploadList>(`/api/uploads?page=${pageParam}&perPage=${GALLERY_PAGE_SIZE}`),
			initialPageParam: 1,
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.config,
			queryFn: () => serverApi<ConfigView>("/api/config"),
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<GalleryView baseUrl={publicBaseUrl()} />
		</HydrationBoundary>
	);
}

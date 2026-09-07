"use client";

import type { Upload, UploadList } from "@snapshot/contracts";
import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadOptions } from "@/lib/api/client";
import { RECENT_LIMIT } from "@/lib/api/dashboard";
import { deleteUpload, fetchUploadStats, fetchUploadsPage, GALLERY_PAGE_SIZE, type UploadInput, uploadFile } from "@/lib/api/gallery";
import { queryKeys } from "@/lib/query-keys";

export function useInfiniteUploads() {
	return useInfiniteQuery({
		queryKey: queryKeys.uploadsInfinite(GALLERY_PAGE_SIZE),
		queryFn: ({ pageParam }) => fetchUploadsPage(pageParam, GALLERY_PAGE_SIZE),
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			const loaded = lastPage.page * lastPage.perPage;
			return loaded < lastPage.total ? lastPage.page + 1 : undefined;
		},
	});
}

export function useUploadStats(id: string | null) {
	return useQuery({
		queryKey: queryKeys.uploadStats(id ?? ""),
		queryFn: () => fetchUploadStats(id as string),
		enabled: id !== null,
	});
}

export function useDeleteUpload() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteUpload,
		onSuccess: ({ id }) => {
			queryClient.setQueryData<InfiniteData<UploadList>>(queryKeys.uploadsInfinite(GALLERY_PAGE_SIZE), (previous) =>
				previous === undefined
					? previous
					: {
							...previous,
							pages: previous.pages.map((page) => ({
								...page,
								total: Math.max(0, page.total - 1),
								items: page.items.filter((upload) => upload.id !== id),
							})),
						},
			);
			void queryClient.invalidateQueries({ queryKey: queryKeys.uploads(1, RECENT_LIMIT) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.statsOverview });
		},
	});
}

export function useUploadFile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ input, options }: { input: UploadInput; options?: UploadOptions }) => uploadFile(input, options),
		onSuccess: (upload: Upload) => {
			queryClient.setQueryData<InfiniteData<UploadList>>(queryKeys.uploadsInfinite(GALLERY_PAGE_SIZE), (previous) =>
				previous === undefined
					? previous
					: {
							...previous,
							pages: previous.pages.map((page, index) => ({
								...page,
								total: page.total + 1,
								items: index === 0 ? [upload, ...page.items] : page.items,
							})),
						},
			);
			void queryClient.invalidateQueries({ queryKey: queryKeys.uploads(1, RECENT_LIMIT) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.statsOverview });
		},
	});
}

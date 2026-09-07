"use client";

import type { Link, LinkCreate, LinkList, LinkUpdate } from "@snapshot/contracts";
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { createLink, deleteLink, fetchLinksPage, LINKS_PAGE_SIZE, type LinkListParams, updateLink } from "@/lib/api/links";
import { queryKeys } from "@/lib/query-keys";

function useLinkListInvalidator() {
	const queryClient = useQueryClient();

	return () => {
		void queryClient.invalidateQueries({ queryKey: ["links", "list"] });
		void queryClient.invalidateQueries({ queryKey: queryKeys.statsOverview });
	};
}

export function useInfiniteLinks(params: LinkListParams) {
	return useInfiniteQuery({
		queryKey: queryKeys.linksInfinite(LINKS_PAGE_SIZE, params.sort, params.order, params.search),
		queryFn: ({ pageParam }) => fetchLinksPage(pageParam, LINKS_PAGE_SIZE, params),
		initialPageParam: 1,
		getNextPageParam: (lastPage: LinkList) => {
			const loaded = lastPage.page * lastPage.perPage;
			return loaded < lastPage.total ? lastPage.page + 1 : undefined;
		},
		placeholderData: keepPreviousData,
	});
}

export function useCreateLink() {
	const invalidate = useLinkListInvalidator();

	return useMutation({
		mutationFn: (input: LinkCreate) => createLink(input),
		onSuccess: () => invalidate(),
	});
}

export function useUpdateLink() {
	const invalidate = useLinkListInvalidator();

	return useMutation({
		mutationFn: ({ slug, input }: { slug: string; input: LinkUpdate }) => updateLink(slug, input),
		onSuccess: (_link: Link) => invalidate(),
	});
}

export function useDeleteLink() {
	const invalidate = useLinkListInvalidator();

	return useMutation({
		mutationFn: (slug: string) => deleteLink(slug),
		onSuccess: () => invalidate(),
	});
}

import type { Link, LinkCreate, LinkDeleteData, LinkList, LinkListQuery, LinkUpdate } from "@snapshot/contracts";

import { clientApi } from "./client";

export const LINKS_PAGE_SIZE = 25;

export type LinkListParams = Pick<LinkListQuery, "sort" | "order" | "search">;

export function linkListPath(page: number, perPage: number, params: LinkListParams): string {
	const query = new URLSearchParams({
		page: String(page),
		perPage: String(perPage),
		sort: params.sort,
		order: params.order,
	});

	if (params.search.length > 0) {
		query.set("search", params.search);
	}

	return `/api/links?${query.toString()}`;
}

export function fetchLinksPage(page: number, perPage: number, params: LinkListParams): Promise<LinkList> {
	return clientApi<LinkList>(linkListPath(page, perPage, params));
}

export function createLink(input: LinkCreate): Promise<Link> {
	return clientApi<Link>("/api/links", { method: "POST", body: JSON.stringify(input) });
}

export function updateLink(slug: string, input: LinkUpdate): Promise<Link> {
	return clientApi<Link>(`/api/links/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteLink(slug: string): Promise<LinkDeleteData> {
	return clientApi<LinkDeleteData>(`/api/links/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

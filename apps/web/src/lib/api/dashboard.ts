import type { ConfigView, LinkList, OverviewStats, UploadList } from "@snapshot/contracts";

import { clientApi } from "./client";

export const RECENT_LIMIT = 5;

export const RECENT_UPLOADS_PATH = `/api/uploads?page=1&perPage=${RECENT_LIMIT}`;
export const RECENT_LINKS_PATH = `/api/links?page=1&perPage=${RECENT_LIMIT}&sort=createdAt&order=desc`;

export function fetchOverview(): Promise<OverviewStats> {
	return clientApi<OverviewStats>("/api/stats/overview");
}

export function fetchRecentUploads(): Promise<UploadList> {
	return clientApi<UploadList>(RECENT_UPLOADS_PATH);
}

export function fetchRecentLinks(): Promise<LinkList> {
	return clientApi<LinkList>(RECENT_LINKS_PATH);
}

export function fetchConfigView(): Promise<ConfigView> {
	return clientApi<ConfigView>("/api/config");
}

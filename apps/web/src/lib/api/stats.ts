import type { StorageBreakdown, UploadActivity } from "@snapshot/contracts";

import { clientApi } from "./client";

export function activityPath(days: number): string {
	return `/api/stats/activity?days=${days}`;
}

export const STORAGE_BREAKDOWN_PATH = "/api/stats/breakdown";

export function fetchActivity(days: number): Promise<UploadActivity> {
	return clientApi<UploadActivity>(activityPath(days));
}

export function fetchStorageBreakdown(): Promise<StorageBreakdown> {
	return clientApi<StorageBreakdown>(STORAGE_BREAKDOWN_PATH);
}

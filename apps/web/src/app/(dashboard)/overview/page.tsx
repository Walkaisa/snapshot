import {
	DEFAULT_STATS_RANGE_DAYS,
	type LinkList,
	type OverviewStats as OverviewStatsData,
	type StorageBreakdown,
	type UploadActivity,
	type UploadList,
} from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ActivityCharts } from "@/components/dashboard/activity-charts";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StorageFormats } from "@/components/dashboard/storage-formats";
import { RECENT_LIMIT, RECENT_LINKS_PATH, RECENT_UPLOADS_PATH } from "@/lib/api/dashboard";
import { serverApi } from "@/lib/api/server";
import { activityPath, STORAGE_BREAKDOWN_PATH } from "@/lib/api/stats";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function OverviewPage() {
	const queryClient = getQueryClient();

	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: queryKeys.statsOverview,
			queryFn: () => serverApi<OverviewStatsData>("/api/stats/overview"),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.statsActivity(DEFAULT_STATS_RANGE_DAYS),
			queryFn: () => serverApi<UploadActivity>(activityPath(DEFAULT_STATS_RANGE_DAYS)),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.statsBreakdown,
			queryFn: () => serverApi<StorageBreakdown>(STORAGE_BREAKDOWN_PATH),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.uploads(1, RECENT_LIMIT),
			queryFn: () => serverApi<UploadList>(RECENT_UPLOADS_PATH),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.links(1, RECENT_LIMIT),
			queryFn: () => serverApi<LinkList>(RECENT_LINKS_PATH),
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<div className="flex flex-col gap-6">
				<OverviewStats />
				<ActivityCharts />
				<div className="grid gap-4 lg:grid-cols-2">
					<StorageFormats />
					<RecentActivity />
				</div>
			</div>
		</HydrationBoundary>
	);
}

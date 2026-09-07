import { z } from "zod";

import { viewCountsSchema } from "./uploads.js";

export const versionInfoSchema = z.object({
	current: z.string().nullable(),
	latest: z.string().nullable(),
	updateAvailable: z.boolean(),
	checkedAt: z.string().nullable(),
});
export type VersionInfo = z.infer<typeof versionInfoSchema>;

export const projectMetaSchema = z.object({
	name: z.string(),
	author: z.string(),
	repository: z.url(),
	version: versionInfoSchema,
});
export type ProjectMeta = z.infer<typeof projectMetaSchema>;

export const STATS_RANGE_DAYS = [7, 30, 90] as const;
export const DEFAULT_STATS_RANGE_DAYS = 30;

export const statsRangeQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(365).default(DEFAULT_STATS_RANGE_DAYS),
});
export type StatsRangeQuery = z.infer<typeof statsRangeQuerySchema>;

export const activityPointSchema = z.object({
	date: z.iso.date(),
	uploads: z.number().int().nonnegative(),
	bytes: z.number().int().nonnegative(),
	pageViews: z.number().int().nonnegative(),
	rawViews: z.number().int().nonnegative(),
	downloadViews: z.number().int().nonnegative(),
	linkVisits: z.number().int().nonnegative(),
});
export type ActivityPoint = z.infer<typeof activityPointSchema>;

export const activityTotalsSchema = z.object({
	uploads: z.number().int().nonnegative(),
	bytes: z.number().int().nonnegative(),
	views: z.number().int().nonnegative(),
});
export type ActivityTotals = z.infer<typeof activityTotalsSchema>;

export const uploadActivitySchema = z.object({
	days: z.number().int().positive(),
	from: z.iso.date(),
	to: z.iso.date(),
	startingBytes: z.number().int().nonnegative(),
	points: z.array(activityPointSchema),
	totals: activityTotalsSchema,
	previous: activityTotalsSchema,
});
export type UploadActivity = z.infer<typeof uploadActivitySchema>;

export const formatUsageSchema = z.object({
	extension: z.string(),
	count: z.number().int().nonnegative(),
	bytes: z.number().int().nonnegative(),
});
export type FormatUsage = z.infer<typeof formatUsageSchema>;

export const storageBreakdownSchema = z.object({
	formats: z.array(formatUsageSchema),
});
export type StorageBreakdown = z.infer<typeof storageBreakdownSchema>;

export const overviewStatsSchema = z.object({
	uploads: z.object({
		count: z.number().int().nonnegative(),
		totalSizeBytes: z.number().int().nonnegative(),
		totalSizeHuman: z.string(),
	}),
	views: viewCountsSchema,
	links: z.object({
		count: z.number().int().nonnegative(),
		visits: z.number().int().nonnegative(),
	}),
	sessions: z.object({
		active: z.number().int().nonnegative(),
	}),
	version: versionInfoSchema,
});
export type OverviewStats = z.infer<typeof overviewStatsSchema>;

import { Injectable } from "@nestjs/common";
import {
	humanReadableSize,
	type OverviewStats,
	overviewStatsSchema,
	type StorageBreakdown,
	storageBreakdownSchema,
	type UploadActivity,
	uploadActivitySchema,
	type ViewCounts,
} from "@snapshot/contracts";
import type { ZodType } from "zod";
import { LinkRepository } from "../../db/repositories/link.repository.js";
import { LinkVisitRepository } from "../../db/repositories/link-visit.repository.js";
import { UploadRepository } from "../../db/repositories/upload.repository.js";
import { UploadViewRepository } from "../../db/repositories/upload-view.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { redisKeys } from "../../redis/redis.constants.js";
import { SessionRegistryService } from "../auth/session-registry.service.js";
import { VersionService } from "../meta/version.service.js";
import { buildActivityPoints, shiftDays, sumTotals, utcDayKey, utcDayStart } from "./activity-series.js";

const OVERVIEW_TTL_SECONDS = 30;
const ACTIVITY_TTL_SECONDS = 60;
const BREAKDOWN_TTL_SECONDS = 60;
const FORMAT_LIMIT = 24;

const uploadsAndViewsSchema = overviewStatsSchema.pick({ uploads: true, views: true });

interface UploadsAndViews {
	uploads: OverviewStats["uploads"];
	views: ViewCounts;
}

@Injectable()
export class StatsService {
	constructor(
		private readonly uploads: UploadRepository,
		private readonly views: UploadViewRepository,
		private readonly links: LinkRepository,
		private readonly linkVisits: LinkVisitRepository,
		private readonly sessions: SessionRegistryService,
		private readonly version: VersionService,
		private readonly cache: CacheService,
	) {}

	async overview(adminId: string): Promise<OverviewStats> {
		const [aggregate, linkCount, linkVisits, activeSessions] = await Promise.all([
			this.uploadsAndViews(),
			this.links.count(),
			this.linkVisits.total(),
			this.sessions.count(adminId),
		]);

		return {
			uploads: aggregate.uploads,
			views: aggregate.views,
			links: { count: linkCount, visits: linkVisits },
			sessions: { active: activeSessions },
			version: this.version.getVersionInfo(),
		};
	}

	async activity(days: number): Promise<UploadActivity> {
		return await this.cached(redisKeys.statsActivity(days), uploadActivitySchema, ACTIVITY_TTL_SECONDS, async () => {
			const to = shiftDays(utcDayStart(new Date()), 1);
			const from = shiftDays(to, -days);
			const previousFrom = shiftDays(from, -days);

			const [uploadRows, viewRows, visitRows, baseline] = await Promise.all([
				this.uploads.dailySeries(previousFrom, to),
				this.views.dailySeries(previousFrom, to),
				this.linkVisits.dailySeries(previousFrom, to),
				this.uploads.totalsBefore(from),
			]);

			const points = buildActivityPoints(from, days, uploadRows, viewRows, visitRows);

			return {
				days,
				from: utcDayKey(from),
				to: utcDayKey(shiftDays(to, -1)),
				startingBytes: baseline.totalSizeBytes,
				points,
				totals: sumTotals(points),
				previous: sumTotals(buildActivityPoints(previousFrom, days, uploadRows, viewRows, visitRows)),
			};
		});
	}

	async breakdown(): Promise<StorageBreakdown> {
		return await this.cached(redisKeys.statsBreakdown, storageBreakdownSchema, BREAKDOWN_TTL_SECONDS, async () => ({
			formats: await this.uploads.formatUsage(FORMAT_LIMIT),
		}));
	}

	private async cached<T>(key: string, schema: ZodType<T>, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
		const cachedValue = await this.cache.getJson<unknown>(key);
		const parsed = schema.safeParse(cachedValue);

		if (parsed.success) {
			return parsed.data;
		}

		if (cachedValue !== null) {
			await this.cache.del(key);
		}

		const fresh = await load();
		await this.cache.setJson(key, fresh, ttlSeconds);

		return fresh;
	}

	private async uploadsAndViews(): Promise<UploadsAndViews> {
		return await this.cached(redisKeys.statsOverview, uploadsAndViewsSchema, OVERVIEW_TTL_SECONDS, async () => {
			const [totals, views] = await Promise.all([this.uploads.totals(), this.views.totals()]);

			return {
				uploads: {
					count: totals.count,
					totalSizeBytes: totals.totalSizeBytes,
					totalSizeHuman: humanReadableSize(totals.totalSizeBytes),
				},
				views,
			};
		});
	}
}

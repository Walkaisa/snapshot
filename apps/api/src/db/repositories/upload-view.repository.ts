import { Inject, Injectable } from "@nestjs/common";
import type { ViewCounts, ViewType } from "@snapshot/contracts";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { uploadViewsTable } from "../schema/index.js";

export interface UploadViewInput {
	uploadId: string;
	viewType: ViewType;
	ipHash?: string | null;
	userAgent?: string | null;
	referer?: string | null;
}

interface ViewTypeCount {
	viewType: ViewType;
	count: number;
}

export interface ViewDailyRow {
	date: string;
	viewType: ViewType;
	count: number;
}

const utcDate = sql<string>`to_char((${uploadViewsTable.viewedAt} at time zone 'UTC')::date, 'YYYY-MM-DD')`;

function toViewCounts(rows: ViewTypeCount[]): ViewCounts {
	const counts: ViewCounts = { page: 0, raw: 0, download: 0, total: 0 };

	for (const row of rows) {
		counts[row.viewType] = row.count;
		counts.total += row.count;
	}

	return counts;
}

@Injectable()
export class UploadViewRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async insert(view: UploadViewInput): Promise<void> {
		await this.db.insert(uploadViewsTable).values({
			uploadId: view.uploadId,
			viewType: view.viewType,
			ipHash: view.ipHash ?? null,
			userAgent: view.userAgent ?? null,
			referer: view.referer ?? null,
		});
	}

	async countsFor(uploadId: string): Promise<ViewCounts> {
		const rows = await this.db
			.select({ viewType: uploadViewsTable.viewType, count: sql<number>`count(*)::int` })
			.from(uploadViewsTable)
			.where(eq(uploadViewsTable.uploadId, uploadId))
			.groupBy(uploadViewsTable.viewType);

		return toViewCounts(rows);
	}

	async countsAll(): Promise<{ uploadId: string; viewType: ViewType; count: number }[]> {
		return await this.db
			.select({
				uploadId: uploadViewsTable.uploadId,
				viewType: uploadViewsTable.viewType,
				count: sql<number>`count(*)::int`,
			})
			.from(uploadViewsTable)
			.groupBy(uploadViewsTable.uploadId, uploadViewsTable.viewType);
	}

	async dailySeries(from: Date, to: Date): Promise<ViewDailyRow[]> {
		return await this.db
			.select({
				date: utcDate,
				viewType: uploadViewsTable.viewType,
				count: sql<number>`count(*)::int`,
			})
			.from(uploadViewsTable)
			.where(and(gte(uploadViewsTable.viewedAt, from), lt(uploadViewsTable.viewedAt, to)))
			.groupBy(utcDate, uploadViewsTable.viewType);
	}

	async totals(): Promise<ViewCounts> {
		const rows = await this.db
			.select({ viewType: uploadViewsTable.viewType, count: sql<number>`count(*)::int` })
			.from(uploadViewsTable)
			.groupBy(uploadViewsTable.viewType);

		return toViewCounts(rows);
	}
}

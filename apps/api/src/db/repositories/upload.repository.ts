import { Inject, Injectable } from "@nestjs/common";
import { THUMBNAIL_MIME_PREFIX, THUMBNAIL_MIME_TYPES } from "@snapshot/contracts";
import { and, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { uploadsTable } from "../schema/index.js";

export interface UploadRecord {
	id: string;
	extension: string;
	mimeType: string;
	sizeBytes: number;
	checksumSha256: string;
	width: number | null;
	height: number | null;
	hasThumbnail: boolean;
	createdAt: Date;
}

export interface UploadTotals {
	count: number;
	totalSizeBytes: number;
}

export interface UploadDailyRow {
	date: string;
	count: number;
	bytes: number;
}

export interface FormatUsageRow {
	extension: string;
	count: number;
	bytes: number;
}

const utcDate = sql<string>`to_char((${uploadsTable.createdAt} at time zone 'UTC')::date, 'YYYY-MM-DD')`;

@Injectable()
export class UploadRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async findAll(): Promise<UploadRecord[]> {
		return await this.db.select().from(uploadsTable).orderBy(desc(uploadsTable.createdAt));
	}

	async findById(id: string): Promise<UploadRecord | null> {
		const [row] = await this.db.select().from(uploadsTable).where(eq(uploadsTable.id, id)).limit(1);

		return row ?? null;
	}

	async listIds(): Promise<string[]> {
		const rows = await this.db.select({ id: uploadsTable.id }).from(uploadsTable);

		return rows.map((row) => row.id);
	}

	async insertMany(records: UploadRecord[]): Promise<void> {
		if (records.length === 0) {
			return;
		}

		await this.db.insert(uploadsTable).values(records).onConflictDoNothing();
	}

	async insert(record: UploadRecord): Promise<void> {
		await this.insertMany([record]);
	}

	async findMissingThumbnails(): Promise<UploadRecord[]> {
		return await this.db
			.select()
			.from(uploadsTable)
			.where(
				and(
					eq(uploadsTable.hasThumbnail, false),
					or(like(uploadsTable.mimeType, `${THUMBNAIL_MIME_PREFIX}%`), inArray(uploadsTable.mimeType, [...THUMBNAIL_MIME_TYPES])),
				),
			)
			.orderBy(desc(uploadsTable.createdAt));
	}

	async markThumbnail(id: string, hasThumbnail: boolean): Promise<void> {
		await this.db.update(uploadsTable).set({ hasThumbnail }).where(eq(uploadsTable.id, id));
	}

	async deleteById(id: string): Promise<boolean> {
		const deleted = await this.db.delete(uploadsTable).where(eq(uploadsTable.id, id)).returning({ id: uploadsTable.id });

		return deleted.length > 0;
	}

	async totals(): Promise<UploadTotals> {
		const [row] = await this.db
			.select({
				count: sql<number>`count(*)::int`,
				totalSizeBytes: sql<string>`coalesce(sum(${uploadsTable.sizeBytes}), 0)`,
			})
			.from(uploadsTable);

		return {
			count: row?.count ?? 0,
			totalSizeBytes: Number(row?.totalSizeBytes ?? 0),
		};
	}

	async totalsBefore(date: Date): Promise<UploadTotals> {
		const [row] = await this.db
			.select({
				count: sql<number>`count(*)::int`,
				totalSizeBytes: sql<string>`coalesce(sum(${uploadsTable.sizeBytes}), 0)`,
			})
			.from(uploadsTable)
			.where(lt(uploadsTable.createdAt, date));

		return {
			count: row?.count ?? 0,
			totalSizeBytes: Number(row?.totalSizeBytes ?? 0),
		};
	}

	async dailySeries(from: Date, to: Date): Promise<UploadDailyRow[]> {
		const rows = await this.db
			.select({
				date: utcDate,
				count: sql<number>`count(*)::int`,
				bytes: sql<string>`coalesce(sum(${uploadsTable.sizeBytes}), 0)`,
			})
			.from(uploadsTable)
			.where(and(gte(uploadsTable.createdAt, from), lt(uploadsTable.createdAt, to)))
			.groupBy(utcDate);

		return rows.map((row) => ({ date: row.date, count: row.count, bytes: Number(row.bytes) }));
	}

	async formatUsage(limit: number): Promise<FormatUsageRow[]> {
		const count = sql<number>`count(*)::int`;
		const rows = await this.db
			.select({
				extension: uploadsTable.extension,
				count,
				bytes: sql<string>`coalesce(sum(${uploadsTable.sizeBytes}), 0)`,
			})
			.from(uploadsTable)
			.groupBy(uploadsTable.extension)
			.orderBy(desc(count))
			.limit(limit);

		return rows.map((row) => ({ extension: row.extension, count: row.count, bytes: Number(row.bytes) }));
	}
}

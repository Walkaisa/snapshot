import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { linkVisitsTable } from "../schema/index.js";

export interface LinkVisitDailyRow {
	date: string;
	count: number;
}

export interface LinkVisitInput {
	linkSlug: string;
	ipHash?: string | null;
	userAgent?: string | null;
	referer?: string | null;
}

const utcDate = sql<string>`to_char((${linkVisitsTable.visitedAt} at time zone 'UTC')::date, 'YYYY-MM-DD')`;

@Injectable()
export class LinkVisitRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async insert(visit: LinkVisitInput): Promise<void> {
		await this.db.insert(linkVisitsTable).values({
			linkSlug: visit.linkSlug,
			ipHash: visit.ipHash ?? null,
			userAgent: visit.userAgent ?? null,
			referer: visit.referer ?? null,
		});
	}

	async countFor(slug: string): Promise<number> {
		const [row] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(linkVisitsTable)
			.where(eq(linkVisitsTable.linkSlug, slug));

		return row?.count ?? 0;
	}

	async dailySeries(from: Date, to: Date): Promise<LinkVisitDailyRow[]> {
		return await this.db
			.select({ date: utcDate, count: sql<number>`count(*)::int` })
			.from(linkVisitsTable)
			.where(and(gte(linkVisitsTable.visitedAt, from), lt(linkVisitsTable.visitedAt, to)))
			.groupBy(utcDate);
	}

	async total(): Promise<number> {
		const [row] = await this.db.select({ count: sql<number>`count(*)::int` }).from(linkVisitsTable);

		return row?.count ?? 0;
	}
}

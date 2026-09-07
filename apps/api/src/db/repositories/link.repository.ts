import { Inject, Injectable } from "@nestjs/common";
import type { LinkSortField, SortOrder } from "@snapshot/contracts";
import { asc, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { linksTable, linkVisitsTable } from "../schema/index.js";

export interface LinkRecord {
	slug: string;
	targetUrl: string;
	createdAt: Date;
}

export interface LinkListRow extends LinkRecord {
	visits: number;
}

export interface LinkListOptions {
	offset: number;
	limit: number;
	sort: LinkSortField;
	order: SortOrder;
	search: string;
}

const visitCount = sql<number>`(select count(*)::int from ${linkVisitsTable} where ${linkVisitsTable.linkSlug} = ${linksTable.slug})`;

const SORT_COLUMNS = {
	slug: linksTable.slug,
	targetUrl: linksTable.targetUrl,
	visits: visitCount,
	createdAt: linksTable.createdAt,
} as const;

function searchFilter(search: string): SQL | undefined {
	if (search.length === 0) {
		return undefined;
	}

	const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

	return or(ilike(linksTable.slug, pattern), ilike(linksTable.targetUrl, pattern));
}

@Injectable()
export class LinkRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async findBySlug(slug: string): Promise<LinkRecord | null> {
		const [row] = await this.db
			.select({ slug: linksTable.slug, targetUrl: linksTable.targetUrl, createdAt: linksTable.createdAt })
			.from(linksTable)
			.where(eq(linksTable.slug, slug))
			.limit(1);

		return row ?? null;
	}

	async list(options: LinkListOptions): Promise<LinkListRow[]> {
		const column = SORT_COLUMNS[options.sort];
		const direction = options.order === "asc" ? asc(column) : desc(column);

		return await this.db
			.select({
				slug: linksTable.slug,
				targetUrl: linksTable.targetUrl,
				createdAt: linksTable.createdAt,
				visits: visitCount,
			})
			.from(linksTable)
			.where(searchFilter(options.search))
			.orderBy(direction, desc(linksTable.createdAt))
			.offset(options.offset)
			.limit(options.limit);
	}

	async insert(record: LinkRecord): Promise<boolean> {
		const inserted = await this.db.insert(linksTable).values(record).onConflictDoNothing().returning({ slug: linksTable.slug });

		return inserted.length > 0;
	}

	async updateTarget(slug: string, targetUrl: string): Promise<LinkRecord | null> {
		const [row] = await this.db
			.update(linksTable)
			.set({ targetUrl })
			.where(eq(linksTable.slug, slug))
			.returning({ slug: linksTable.slug, targetUrl: linksTable.targetUrl, createdAt: linksTable.createdAt });

		return row ?? null;
	}

	async deleteBySlug(slug: string): Promise<boolean> {
		const deleted = await this.db.delete(linksTable).where(eq(linksTable.slug, slug)).returning({ slug: linksTable.slug });

		return deleted.length > 0;
	}

	async count(search = ""): Promise<number> {
		const [row] = await this.db.select({ count: sql<number>`count(*)::int` }).from(linksTable).where(searchFilter(search));

		return row?.count ?? 0;
	}
}

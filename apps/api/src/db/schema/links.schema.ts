import { bigint, char, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const linksTable = pgTable(
	"links",
	{
		slug: varchar({ length: 64 }).primaryKey(),
		targetUrl: text().notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("links_created_at_idx").on(table.createdAt)],
);

export const linkVisitsTable = pgTable(
	"link_visits",
	{
		id: bigint({ mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
		linkSlug: varchar({ length: 64 })
			.notNull()
			.references(() => linksTable.slug, { onDelete: "cascade" }),
		visitedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		ipHash: char({ length: 64 }),
		userAgent: varchar({ length: 255 }),
		referer: varchar({ length: 255 }),
	},
	(table) => [index("link_visits_link_slug_idx").on(table.linkSlug), index("link_visits_visited_at_idx").on(table.visitedAt)],
);

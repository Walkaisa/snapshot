import { bigint, boolean, char, index, integer, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const viewTypeEnum = pgEnum("view_type", ["page", "raw", "download"]);

export const uploadsTable = pgTable(
	"uploads",
	{
		id: varchar({ length: 64 }).primaryKey(),
		extension: varchar({ length: 10 }).notNull(),
		mimeType: varchar({ length: 100 }).notNull(),
		sizeBytes: bigint({ mode: "number" }).notNull(),
		checksumSha256: char({ length: 64 }).notNull(),
		width: integer(),
		height: integer(),
		hasThumbnail: boolean().notNull().default(false),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("uploads_created_at_idx").on(table.createdAt)],
);

export const uploadViewsTable = pgTable(
	"upload_views",
	{
		id: bigint({ mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
		uploadId: varchar({ length: 64 })
			.notNull()
			.references(() => uploadsTable.id, { onDelete: "cascade" }),
		viewType: viewTypeEnum().notNull(),
		viewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		ipHash: char({ length: 64 }),
		userAgent: varchar({ length: 255 }),
		referer: varchar({ length: 255 }),
	},
	(table) => [
		index("upload_views_upload_id_viewed_at_idx").on(table.uploadId, table.viewedAt),
		index("upload_views_viewed_at_idx").on(table.viewedAt),
	],
);

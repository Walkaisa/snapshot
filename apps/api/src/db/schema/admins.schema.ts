import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
	id: uuid().primaryKey().defaultRandom(),
	username: varchar({ length: 64 }).notNull().unique(),
	passwordHash: text().notNull(),
	passwordChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	totpSecret: text(),
	totpLabel: varchar({ length: 64 }),
	totpConfirmedAt: timestamp({ withTimezone: true }),
	theme: text().notNull().default("system"),
	locale: text().notNull().default("system"),
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const adminRecoveryCodesTable = pgTable(
	"admin_recovery_codes",
	{
		id: uuid().primaryKey().defaultRandom(),
		adminId: uuid()
			.notNull()
			.references(() => adminsTable.id, { onDelete: "cascade" }),
		codeHash: text().notNull(),
		usedAt: timestamp({ withTimezone: true }),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("admin_recovery_codes_admin_id_idx").on(table.adminId)],
);

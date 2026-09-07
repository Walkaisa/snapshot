import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
	key: varchar({ length: 64 }).primaryKey(),
	value: jsonb().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

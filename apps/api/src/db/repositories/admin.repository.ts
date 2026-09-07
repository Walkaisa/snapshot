import { Inject, Injectable } from "@nestjs/common";
import type { LocaleChoice, PreferencesUpdate, ThemeChoice } from "@snapshot/contracts";
import { eq, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { adminsTable } from "../schema/index.js";

export interface AdminRecord {
	id: string;
	username: string;
	passwordHash: string;
	passwordChangedAt: Date;
	totpSecret: string | null;
	totpLabel: string | null;
	totpConfirmedAt: Date | null;
	theme: ThemeChoice;
	locale: LocaleChoice;
	createdAt: Date;
	updatedAt: Date;
}

function toAdminRecord(row: typeof adminsTable.$inferSelect): AdminRecord {
	return { ...row, theme: row.theme as ThemeChoice, locale: row.locale as LocaleChoice };
}

@Injectable()
export class AdminRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async count(): Promise<number> {
		const [row] = await this.db.select({ count: sql<number>`count(*)::int` }).from(adminsTable);

		return row?.count ?? 0;
	}

	async findByUsername(username: string): Promise<AdminRecord | null> {
		const [row] = await this.db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);

		return row ? toAdminRecord(row) : null;
	}

	async findById(id: string): Promise<AdminRecord | null> {
		const [row] = await this.db.select().from(adminsTable).where(eq(adminsTable.id, id)).limit(1);

		return row ? toAdminRecord(row) : null;
	}

	async createInitial(username: string, passwordHash: string): Promise<AdminRecord | null> {
		return this.db.transaction(async (tx) => {
			await tx.execute(sql`select pg_advisory_xact_lock(hashtext('snapshot:initial-admin'))`);

			const [existing] = await tx.select({ id: adminsTable.id }).from(adminsTable).limit(1);

			if (existing !== undefined) {
				return null;
			}

			const [row] = await tx.insert(adminsTable).values({ username, passwordHash }).returning();

			return toAdminRecord(row as typeof adminsTable.$inferSelect);
		});
	}

	async updateUsername(id: string, username: string): Promise<void> {
		await this.db.update(adminsTable).set({ username, updatedAt: sql`now()` }).where(eq(adminsTable.id, id));
	}

	async updatePreferences(id: string, preferences: PreferencesUpdate): Promise<void> {
		await this.db
			.update(adminsTable)
			.set({ ...preferences, updatedAt: sql`now()` })
			.where(eq(adminsTable.id, id));
	}

	async updateTotp(id: string, totp: { secret: string | null; label: string | null; confirmedAt: Date | null }): Promise<void> {
		await this.db
			.update(adminsTable)
			.set({ totpSecret: totp.secret, totpLabel: totp.label, totpConfirmedAt: totp.confirmedAt, updatedAt: sql`now()` })
			.where(eq(adminsTable.id, id));
	}

	async updatePassword(id: string, passwordHash: string): Promise<void> {
		await this.db
			.update(adminsTable)
			.set({ passwordHash, passwordChangedAt: sql`now()`, updatedAt: sql`now()` })
			.where(eq(adminsTable.id, id));
	}
}

import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { adminRecoveryCodesTable } from "../schema/index.js";

export interface RecoveryCodeRecord {
	id: string;
	codeHash: string;
}

@Injectable()
export class RecoveryCodeRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async listUnused(adminId: string): Promise<RecoveryCodeRecord[]> {
		const rows = await this.db
			.select({ id: adminRecoveryCodesTable.id, codeHash: adminRecoveryCodesTable.codeHash })
			.from(adminRecoveryCodesTable)
			.where(and(eq(adminRecoveryCodesTable.adminId, adminId), isNull(adminRecoveryCodesTable.usedAt)));

		return rows;
	}

	async countUnused(adminId: string): Promise<number> {
		const [row] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(adminRecoveryCodesTable)
			.where(and(eq(adminRecoveryCodesTable.adminId, adminId), isNull(adminRecoveryCodesTable.usedAt)));

		return row?.count ?? 0;
	}

	async replaceAll(adminId: string, codeHashes: string[]): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.delete(adminRecoveryCodesTable).where(eq(adminRecoveryCodesTable.adminId, adminId));

			if (codeHashes.length > 0) {
				await tx.insert(adminRecoveryCodesTable).values(codeHashes.map((codeHash) => ({ adminId, codeHash })));
			}
		});
	}

	async deleteAll(adminId: string): Promise<void> {
		await this.db.delete(adminRecoveryCodesTable).where(eq(adminRecoveryCodesTable.adminId, adminId));
	}

	async consume(id: string): Promise<boolean> {
		const rows = await this.db
			.update(adminRecoveryCodesTable)
			.set({ usedAt: sql`now()` })
			.where(and(eq(adminRecoveryCodesTable.id, id), isNull(adminRecoveryCodesTable.usedAt)))
			.returning({ id: adminRecoveryCodesTable.id });

		return rows.length > 0;
	}
}

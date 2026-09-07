import { Inject, Injectable } from "@nestjs/common";
import { inArray, sql } from "drizzle-orm";

import { toCamelCase, toSnakeCase } from "../../common/utils/case.js";
import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { configTable } from "../schema/index.js";

@Injectable()
export class ConfigRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async readAll(): Promise<Record<string, unknown>> {
		const rows = await this.db.select().from(configTable);

		return Object.fromEntries(rows.map((row) => [toCamelCase(row.key), row.value]));
	}

	async deleteMany(keys: string[]): Promise<void> {
		if (keys.length === 0) {
			return;
		}

		await this.db.delete(configTable).where(inArray(configTable.key, keys.map(toSnakeCase)));
	}

	async upsertMany(values: Record<string, unknown>): Promise<void> {
		const rows = Object.entries(values).map(([key, value]) => ({
			key: toSnakeCase(key),
			value: sql`${JSON.stringify(value)}::jsonb`,
		}));

		if (rows.length === 0) {
			return;
		}

		await this.db
			.insert(configTable)
			.values(rows)
			.onConflictDoUpdate({
				target: configTable.key,
				set: { value: sql`excluded.value`, updatedAt: sql`now()` },
			});
	}
}

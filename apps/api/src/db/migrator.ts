import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

export async function runMigrations(databaseUrl: string): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });

	try {
		await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
	} finally {
		await client.end();
	}
}

import postgres from "postgres";

import { TEST_DATABASE_NAME, TEST_MAINTENANCE_URL } from "../test-env.js";

export default async function setup(): Promise<void> {
	const client = postgres(TEST_MAINTENANCE_URL, { max: 1, onnotice: () => {} });

	try {
		const existing = await client`SELECT 1 FROM pg_database WHERE datname = ${TEST_DATABASE_NAME}`;

		if (existing.length === 0) {
			await client.unsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
		}
	} finally {
		await client.end();
	}
}

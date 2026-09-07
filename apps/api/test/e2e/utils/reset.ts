import { Redis } from "ioredis";
import postgres from "postgres";

import { TEST_DATABASE_URL, TEST_REDIS_URL } from "../../test-env.js";

export async function resetDatabase(): Promise<void> {
	const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });

	try {
		await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
		await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
		await client.unsafe("CREATE SCHEMA public");
	} finally {
		await client.end();
	}
}

export async function resetRedis(): Promise<void> {
	const redis = new Redis(TEST_REDIS_URL);

	try {
		await redis.flushdb();
	} finally {
		await redis.quit();
	}
}

const POSTGRES_BASE = process.env.TEST_POSTGRES_URL ?? "postgres://snapshot:snapshot@localhost:5432";

export const TEST_DATABASE_NAME = "snapshot_test";
export const TEST_DATABASE_URL = `${POSTGRES_BASE}/${TEST_DATABASE_NAME}`;
export const TEST_MAINTENANCE_URL = `${POSTGRES_BASE}/postgres`;
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/1";

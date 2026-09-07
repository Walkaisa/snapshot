import { tmpdir } from "node:os";
import path from "node:path";

import { TEST_DATABASE_URL, TEST_REDIS_URL } from "./test-env.js";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.REDIS_URL = TEST_REDIS_URL;
process.env.BASE_URL = "http://localhost:3000";
process.env.UPLOADS_DIR = path.join(tmpdir(), "snapshot-test-uploads");
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
process.env.MFA_ENCRYPTION_KEY = "test-mfa-encryption-key-at-least-32-characters";
process.env.ARGON2_TIME_COST = "1";
process.env.ARGON2_MEMORY_COST = "1024";
process.env.ARGON2_PARALLELISM = "1";

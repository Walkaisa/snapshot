import { z } from "zod";

const httpUrl = z
	.string()
	.trim()
	.regex(/^https?:\/\//i, { message: "Must start with http:// or https://" })
	.transform((value) => value.replace(/\/+$/, ""));

export const DEV_SESSION_SECRET = "insecure-development-session-secret-change-me";
export const DEV_MFA_ENCRYPTION_KEY = "insecure-development-mfa-key-change-me";
export const DEV_DATABASE_URL = "postgres://snapshot:snapshot@localhost:5432/snapshot";
export const DEV_REDIS_URL = "redis://localhost:6379";

export const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const appVersion = z
	.string()
	.trim()
	.transform((value) => value.replace(/^v/i, ""))
	.refine((value) => SEMVER_PATTERN.test(value))
	.optional()
	.catch(undefined);

export const apiEnvSchema = z
	.object({
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		APP_VERSION: appVersion,
		PORT: z.coerce.number().int().min(1).max(65535).default(3001),
		BASE_URL: httpUrl.default("http://localhost:3000"),
		DATABASE_URL: z.url({ message: "DATABASE_URL must be a valid postgres:// URL" }).default(DEV_DATABASE_URL),
		REDIS_URL: z.url({ message: "REDIS_URL must be a valid redis:// URL" }).default(DEV_REDIS_URL),
		UPLOADS_DIR: z.string().min(1).default("uploads"),
		LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
		SESSION_SECRET: z.string().min(32).default(DEV_SESSION_SECRET),
		MFA_ENCRYPTION_KEY: z.string().min(32).default(DEV_MFA_ENCRYPTION_KEY),
		SESSION_TTL_HOURS: z.coerce.number().int().min(1).default(24),
		SESSION_ABSOLUTE_TTL_HOURS: z.coerce.number().int().min(1).default(168),
		ARGON2_TIME_COST: z.coerce.number().int().min(1).default(3),
		ARGON2_MEMORY_COST: z.coerce.number().int().min(1024).default(65536),
		ARGON2_PARALLELISM: z.coerce.number().int().min(1).default(4),
	})
	.superRefine((env, ctx) => {
		if (env.NODE_ENV === "production" && env.SESSION_SECRET === DEV_SESSION_SECRET) {
			ctx.addIssue({
				code: "custom",
				path: ["SESSION_SECRET"],
				message: "SESSION_SECRET must be set to a strong secret in production",
			});
		}

		if (env.NODE_ENV === "production" && env.MFA_ENCRYPTION_KEY === DEV_MFA_ENCRYPTION_KEY) {
			ctx.addIssue({
				code: "custom",
				path: ["MFA_ENCRYPTION_KEY"],
				message: "MFA_ENCRYPTION_KEY must be set to a strong secret in production",
			});
		}

		if (env.SESSION_ABSOLUTE_TTL_HOURS < env.SESSION_TTL_HOURS) {
			ctx.addIssue({
				code: "custom",
				path: ["SESSION_ABSOLUTE_TTL_HOURS"],
				message: "SESSION_ABSOLUTE_TTL_HOURS must be greater than or equal to SESSION_TTL_HOURS",
			});
		}
	});
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const webEnvSchema = z.object({
	API_INTERNAL_URL: httpUrl.default("http://localhost:3001"),
	NEXT_PUBLIC_BASE_URL: httpUrl.optional(),
});
export type WebEnv = z.infer<typeof webEnvSchema>;

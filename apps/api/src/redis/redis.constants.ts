import type { ViewType } from "@snapshot/contracts";

export const REDIS = Symbol("REDIS");

export const redisKeys = {
	authInitialized: "snapshot:cache:auth:initialized",
	upload: (id: string): string => `snapshot:cache:upload:${id}`,
	uploadsIndex: "snapshot:cache:uploads:index",
	link: (slug: string): string => `snapshot:cache:link:${slug}`,
	viewCounter: (id: string, type: ViewType): string => `snapshot:cache:views:${id}:${type}`,
	runtimeConfig: "snapshot:cache:config:runtime",
	statsOverview: "snapshot:cache:stats:overview",
	statsActivity: (days: number): string => `snapshot:cache:stats:activity:${days}`,
	statsBreakdown: "snapshot:cache:stats:breakdown",
	totpReplay: (adminId: string, counter: number): string => `snapshot:mfa:totp:${adminId}:${counter}`,
	writeRateLimit: (client: string, windowSeconds: number): string => `snapshot:ratelimit:write:${windowSeconds}:${client}`,
} as const;

export const VIEW_TYPES: readonly ViewType[] = ["page", "raw", "download"];

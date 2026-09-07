import type { AuthAdmin } from "./auth.types.js";

export interface PendingMfa {
	adminId: string;
	startedAt: string;
}

declare module "express-session" {
	interface SessionData {
		passport?: { user?: string };
		pendingMfa?: PendingMfa;
		ip?: string | null;
		userAgent?: string | null;
		createdAt?: string;
		lastSeenAt?: string;
	}
}

declare global {
	namespace Express {
		interface User extends AuthAdmin {}
	}
}

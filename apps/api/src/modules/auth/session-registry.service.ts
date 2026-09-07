import { Inject, Injectable } from "@nestjs/common";
import type { SessionInfo } from "@snapshot/contracts";
import type { RedisStore } from "connect-redis";
import type { SessionData } from "express-session";
import type { RedisClientType } from "redis";

import { adminSessionsKey, SESSION_REDIS, SESSION_STORE } from "./auth.constants.js";

interface RegisteredSession {
	id: string;
	data: SessionData;
}

@Injectable()
export class SessionRegistryService {
	constructor(
		@Inject(SESSION_REDIS) private readonly redis: RedisClientType,
		@Inject(SESSION_STORE) private readonly store: RedisStore,
	) {}

	async register(adminId: string, sessionId: string): Promise<void> {
		await this.redis.sAdd(adminSessionsKey(adminId), sessionId);
	}

	async count(adminId: string): Promise<number> {
		return (await this.activeSessions(adminId)).length;
	}

	async unregister(adminId: string, sessionId: string): Promise<void> {
		await this.redis.sRem(adminSessionsKey(adminId), sessionId);
	}

	async list(adminId: string, currentSessionId: string): Promise<SessionInfo[]> {
		const sessions = (await this.activeSessions(adminId)).map(({ id, data }) => ({
			id,
			ip: data.ip ?? null,
			userAgent: data.userAgent ?? null,
			createdAt: data.createdAt ?? new Date(0).toISOString(),
			lastSeenAt: data.lastSeenAt ?? data.createdAt ?? new Date(0).toISOString(),
			current: id === currentSessionId,
		}));

		return sessions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	async revokeOthers(adminId: string, currentSessionId: string): Promise<number> {
		const sessionIds = (await this.activeSessions(adminId)).map(({ id }) => id).filter((sessionId) => sessionId !== currentSessionId);

		await Promise.all(sessionIds.map((sessionId) => this.destroy(adminId, sessionId)));

		return sessionIds.length;
	}

	async revokeOne(adminId: string, sessionId: string): Promise<number> {
		const isMember = await this.redis.sIsMember(adminSessionsKey(adminId), sessionId);

		if (!isMember) {
			return 0;
		}

		if ((await this.store.get(sessionId)) === null) {
			await this.redis.sRem(adminSessionsKey(adminId), sessionId);
			return 0;
		}

		await this.destroy(adminId, sessionId);
		return 1;
	}

	private async activeSessions(adminId: string): Promise<RegisteredSession[]> {
		const key = adminSessionsKey(adminId);
		const sessionIds = await this.redis.sMembers(key);
		const loaded = await Promise.all(sessionIds.map(async (id) => ({ id, data: (await this.store.get(id)) as SessionData | null })));
		const staleIds = loaded.filter(({ data }) => data === null).map(({ id }) => id);

		if (staleIds.length > 0) {
			await this.redis.sRem(key, staleIds);
		}

		return loaded.filter((session): session is RegisteredSession => session.data !== null);
	}

	private async destroy(adminId: string, sessionId: string): Promise<void> {
		await this.store.destroy(sessionId);
		await this.redis.sRem(adminSessionsKey(adminId), sessionId);
	}
}

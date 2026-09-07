import { RedisStore } from "connect-redis";
import { type CsrfSync, csrfSync } from "csrf-sync";
import { createClient, type RedisClientType } from "redis";

import { AppConfigService } from "../../config/app-config.service.js";
import { CSRF, CSRF_HEADER, SESSION_REDIS, SESSION_STORE, SESSION_STORE_PREFIX } from "./auth.constants.js";

export const sessionRedisProvider = {
	provide: SESSION_REDIS,
	inject: [AppConfigService],
	useFactory: (config: AppConfigService): RedisClientType => {
		const client: RedisClientType = createClient({ url: config.env.REDIS_URL });
		client.on("error", () => {});
		return client;
	},
};

export const sessionStoreProvider = {
	provide: SESSION_STORE,
	inject: [SESSION_REDIS],
	useFactory: (client: RedisClientType): RedisStore => new RedisStore({ client, prefix: SESSION_STORE_PREFIX }),
};

export const csrfProvider = {
	provide: CSRF,
	useFactory: (): CsrfSync =>
		csrfSync({
			getTokenFromRequest: (req) => {
				const header = req.headers[CSRF_HEADER];
				return Array.isArray(header) ? header[0] : header;
			},
		}),
};

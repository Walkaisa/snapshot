import type { INestApplication } from "@nestjs/common";
import type { RedisStore } from "connect-redis";
import session from "express-session";
import passport from "passport";

import { AppConfigService } from "../../config/app-config.service.js";
import { SESSION_STORE, sessionCookieName } from "./auth.constants.js";

const HOUR_MS = 60 * 60 * 1000;

export function configureSession(app: INestApplication): void {
	const config = app.get(AppConfigService);
	const store = app.get<RedisStore>(SESSION_STORE);
	const isProduction = config.isProduction;

	(app.getHttpAdapter().getInstance() as { set: (key: string, value: unknown) => void }).set("trust proxy", 1);

	app.use(
		session({
			name: sessionCookieName(isProduction),
			secret: config.env.SESSION_SECRET,
			store,
			resave: false,
			saveUninitialized: false,
			rolling: true,
			cookie: {
				httpOnly: true,
				sameSite: "strict",
				secure: isProduction,
				path: "/",
				maxAge: config.env.SESSION_TTL_HOURS * HOUR_MS,
			},
		}),
	);
	app.use(passport.initialize());
	app.use(passport.session());
}

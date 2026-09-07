import { type INestApplication, RequestMethod } from "@nestjs/common";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import { configureSession } from "./modules/auth/session.setup.js";

export function configureApp(app: INestApplication): void {
	app.useLogger(app.get(Logger));
	app.use(helmet());
	configureSession(app);
	app.setGlobalPrefix("api", {
		exclude: [{ path: "raw/:filename", method: RequestMethod.GET }],
	});
	app.enableShutdownHooks();
}

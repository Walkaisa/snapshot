import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module.js";
import { configureApp } from "./bootstrap.js";
import { AppConfigService } from "./config/app-config.service.js";
import { loadLocalEnv } from "./config/load-env.js";

async function bootstrap(): Promise<void> {
	loadLocalEnv();

	const app = await NestFactory.create(AppModule, { bufferLogs: true });
	configureApp(app);

	const config = app.get(AppConfigService);
	await app.listen(config.env.PORT);

	app.get(Logger).log(`Snapshot API listening on port ${config.env.PORT}`, "Bootstrap");
}

void bootstrap();

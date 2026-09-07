import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { RequestMethod } from "@nestjs/common";
import type { Params } from "nestjs-pino";

import type { AppConfigService } from "../../config/app-config.service.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

function resolveRequestId(req: IncomingMessage): string {
	const header = req.headers["x-request-id"];
	const candidate = Array.isArray(header) ? header[0] : header;

	return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function createLoggerOptions(config: AppConfigService): Params {
	const pretty = !config.isProduction && !config.isTest;

	return {
		forRoutes: [{ path: "{*path}", method: RequestMethod.ALL }],
		pinoHttp: {
			level: config.isTest ? "silent" : config.env.LOG_LEVEL,
			genReqId: (req: IncomingMessage, res: ServerResponse) => {
				const id = resolveRequestId(req);
				res.setHeader("x-request-id", id);
				return id;
			},
			redact: {
				paths: ["req.headers.authorization", "req.headers.cookie", 'req.headers["x-api-key"]', 'req.headers["x-csrf-token"]'],
				remove: true,
			},
			autoLogging: {
				ignore: (req: IncomingMessage) => req.url === "/api/healthz",
			},
			transport: pretty ? { target: "pino-pretty", options: { singleLine: true, translateTime: "SYS:standard" } } : undefined,
		},
	};
}

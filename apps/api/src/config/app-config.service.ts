import { Injectable } from "@nestjs/common";
import type { ApiEnv } from "@snapshot/contracts";

import { loadApiEnv } from "./env.js";

@Injectable()
export class AppConfigService {
	readonly env: ApiEnv;

	constructor() {
		this.env = loadApiEnv();
	}

	get isProduction(): boolean {
		return this.env.NODE_ENV === "production";
	}

	get isTest(): boolean {
		return this.env.NODE_ENV === "test";
	}
}

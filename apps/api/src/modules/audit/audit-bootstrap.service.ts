import { Injectable, type OnApplicationBootstrap } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service.js";
import { AuditService } from "./audit.service.js";

@Injectable()
export class AuditBootstrapService implements OnApplicationBootstrap {
	constructor(
		private readonly audit: AuditService,
		private readonly config: AppConfigService,
	) {}

	onApplicationBootstrap(): void {
		this.audit.record({
			action: "system.startup",
			metadata: {
				version: this.config.env.APP_VERSION ?? "unknown",
				environment: this.config.env.NODE_ENV,
				node: process.versions.node,
			},
		});
	}
}

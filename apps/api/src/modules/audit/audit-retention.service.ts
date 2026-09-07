import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";

import { AuditRepository } from "../../db/repositories/audit.repository.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";
import { AuditService } from "./audit.service.js";

const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuditRetentionService implements OnApplicationBootstrap, OnApplicationShutdown {
	private readonly logger = new Logger(AuditRetentionService.name);
	private timer: NodeJS.Timeout | null = null;

	constructor(
		private readonly repository: AuditRepository,
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly audit: AuditService,
	) {}

	onApplicationBootstrap(): void {
		this.timer = setInterval(() => void this.prune(), PRUNE_INTERVAL_MS);
		this.timer.unref();
		void this.prune();
	}

	onApplicationShutdown(): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	async prune(): Promise<number> {
		try {
			const { auditRetentionDays } = await this.runtimeConfig.get();
			const cutoff = new Date(Date.now() - auditRetentionDays * MS_PER_DAY);
			const deleted = await this.repository.deleteOlderThan(cutoff);

			if (deleted > 0) {
				this.audit.record({
					action: "system.audit_pruned",
					metadata: { deleted, retentionDays: auditRetentionDays },
				});
			}

			return deleted;
		} catch (error) {
			this.logger.error({ err: error }, "Could not prune the audit log");

			return 0;
		}
	}
}

import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import type { AuditAction, AuditActor, AuditOutcome } from "@snapshot/contracts";
import { auditSeverityFor, auditTargetTypeOf, maxAuditSeverity } from "@snapshot/contracts";

import { AuditRepository, type AuditWrite } from "../../db/repositories/audit.repository.js";
import { sanitizeAuditMetadata } from "./audit-metadata.js";

export interface AuditInput {
	action: AuditAction;
	outcome?: AuditOutcome;
	actor?: AuditActor;
	targetId?: string | null;
	errorCode?: string | null;
	requestId?: string | null;
	method?: string | null;
	path?: string | null;
	durationMs?: number | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	metadata?: Record<string, unknown> | null;
}

const FLUSH_INTERVAL_MS = 1_000;
const FLUSH_BATCH_SIZE = 100;
const BUFFER_LIMIT = 1_000;
const MAX_PATH_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 255;

@Injectable()
export class AuditService implements OnApplicationShutdown {
	private readonly logger = new Logger(AuditService.name);
	private readonly buffer: AuditWrite[] = [];
	private timer: NodeJS.Timeout | null = null;
	private flushing: Promise<void> | null = null;
	private dropped = 0;

	constructor(private readonly repository: AuditRepository) {}

	record(input: AuditInput): void {
		const outcome = input.outcome ?? "success";
		const severity = auditSeverityFor(input.action, outcome);

		if (this.buffer.length >= BUFFER_LIMIT) {
			this.dropped += 1;
			return;
		}

		this.buffer.push({
			occurredAt: new Date(),
			action: input.action,
			severity,
			outcome,
			actor: input.actor ?? "system",
			targetType: auditTargetTypeOf(input.action),
			targetId: input.targetId ?? null,
			errorCode: input.errorCode ?? null,
			requestId: input.requestId ?? null,
			method: input.method ?? null,
			path: input.path?.slice(0, MAX_PATH_LENGTH) ?? null,
			durationMs: input.durationMs ?? null,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
			metadata: sanitizeAuditMetadata(input.metadata),
		});

		if (severity === "error" || severity === "critical" || this.buffer.length >= FLUSH_BATCH_SIZE) {
			void this.flush();
			return;
		}

		this.arm();
	}

	async flush(): Promise<void> {
		this.flushing = (this.flushing ?? Promise.resolve()).then(() => this.drain());

		await this.flushing;
	}

	async onApplicationShutdown(): Promise<void> {
		this.disarm();
		await this.flush();
	}

	private arm(): void {
		if (this.timer !== null) {
			return;
		}

		this.timer = setTimeout(() => {
			this.timer = null;
			void this.flush();
		}, FLUSH_INTERVAL_MS);
		this.timer.unref();
	}

	private disarm(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private async drain(): Promise<void> {
		while (this.buffer.length > 0) {
			const batch = this.buffer.splice(0, FLUSH_BATCH_SIZE);

			try {
				await this.repository.insertMany(batch);
			} catch (error) {
				this.dropped += batch.length;
				this.logger.error({ err: error, entries: batch.length }, "Could not persist audit entries");
				return;
			}
		}

		await this.reportDrops();
	}

	private async reportDrops(): Promise<void> {
		if (this.dropped === 0) {
			return;
		}

		const dropped = this.dropped;
		this.dropped = 0;

		try {
			await this.repository.insertMany([
				{
					occurredAt: new Date(),
					action: "system.audit_overflow",
					severity: maxAuditSeverity(auditSeverityFor("system.audit_overflow", "failure"), "error"),
					outcome: "failure",
					actor: "system",
					targetType: auditTargetTypeOf("system.audit_overflow"),
					targetId: null,
					errorCode: null,
					requestId: null,
					method: null,
					path: null,
					durationMs: null,
					ipAddress: null,
					userAgent: null,
					metadata: { dropped },
				},
			]);
		} catch (error) {
			this.logger.error({ err: error, dropped }, "Could not record the audit overflow marker");
		}
	}
}

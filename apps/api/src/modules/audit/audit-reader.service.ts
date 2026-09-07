import { Injectable } from "@nestjs/common";
import type { AuditEntry, AuditPage, AuditQuery, AuditSeverity, AuditSummary } from "@snapshot/contracts";
import { AUDIT_SEVERITIES, auditActionsIn, auditCategoryOf } from "@snapshot/contracts";

import { type AuditFilter, AuditRepository, type AuditRow } from "../../db/repositories/audit.repository.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";

function toFilter(query: AuditQuery): AuditFilter {
	return {
		actions: query.categories.length > 0 ? auditActionsIn(query.categories) : null,
		severities: query.severities,
		outcomes: query.outcomes,
		actors: query.actors,
		from: query.from === null || query.from === undefined ? null : new Date(query.from),
		to: query.to === null || query.to === undefined ? null : new Date(query.to),
		search: query.search,
	};
}

function toEntry(row: AuditRow): AuditEntry {
	return {
		id: row.id,
		occurredAt: row.occurredAt.toISOString(),
		action: row.action,
		category: auditCategoryOf(row.action),
		severity: row.severity,
		outcome: row.outcome,
		actor: row.actor,
		targetType: (row.targetType as AuditEntry["targetType"]) ?? null,
		targetId: row.targetId,
		errorCode: row.errorCode,
		requestId: row.requestId,
		method: row.method,
		path: row.path,
		durationMs: row.durationMs,
		ipAddress: row.ipAddress,
		userAgent: row.userAgent,
		metadata: row.metadata,
	};
}

@Injectable()
export class AuditReaderService {
	constructor(
		private readonly repository: AuditRepository,
		private readonly runtimeConfig: RuntimeConfigService,
	) {}

	async list(query: AuditQuery): Promise<AuditPage> {
		const filter = toFilter(query);
		const [rows, total] = await Promise.all([
			this.repository.list(filter, (query.page - 1) * query.perPage, query.perPage),
			this.repository.count(filter),
		]);

		return { items: rows.map(toEntry), total, page: query.page, perPage: query.perPage };
	}

	async summary(query: AuditQuery): Promise<AuditSummary> {
		const filter = toFilter(query);
		const [counts, bounds, config] = await Promise.all([
			this.repository.countBySeverity(filter),
			this.repository.bounds(),
			this.runtimeConfig.get(),
		]);

		const bySeverity = Object.fromEntries(AUDIT_SEVERITIES.map((severity) => [severity, 0])) as Record<AuditSeverity, number>;
		let total = 0;

		for (const row of counts) {
			bySeverity[row.severity] = row.count;
			total += row.count;
		}

		return {
			total,
			bySeverity,
			oldestAt: bounds.oldestAt?.toISOString() ?? null,
			newestAt: bounds.newestAt?.toISOString() ?? null,
			retentionDays: config.auditRetentionDays,
		};
	}
}

import { Inject, Injectable } from "@nestjs/common";
import type { AuditAction, AuditActor, AuditOutcome, AuditSeverity } from "@snapshot/contracts";
import { and, count, desc, gte, inArray, lte, max, min, or, type SQL, sql } from "drizzle-orm";

import { DRIZZLE } from "../database.constants.js";
import type { Database } from "../database.types.js";
import { auditLogsTable } from "../schema/index.js";

export interface AuditWrite {
	occurredAt: Date;
	action: AuditAction;
	severity: AuditSeverity;
	outcome: AuditOutcome;
	actor: AuditActor;
	targetType: string | null;
	targetId: string | null;
	errorCode: string | null;
	requestId: string | null;
	method: string | null;
	path: string | null;
	durationMs: number | null;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: Record<string, unknown> | null;
}

export interface AuditRow extends AuditWrite {
	id: number;
}

export interface AuditFilter {
	actions: AuditAction[] | null;
	severities: AuditSeverity[];
	outcomes: AuditOutcome[];
	actors: AuditActor[];
	from: Date | null;
	to: Date | null;
	search: string;
}

export interface AuditSeverityCount {
	severity: AuditSeverity;
	count: number;
}

export interface AuditBounds {
	oldestAt: Date | null;
	newestAt: Date | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
	if (value === null || value === undefined) {
		return null;
	}

	return value instanceof Date ? value : new Date(value);
}

function escapeLike(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function conditions(filter: AuditFilter): SQL | undefined {
	const clauses: (SQL | undefined)[] = [];

	if (filter.actions !== null) {
		clauses.push(filter.actions.length > 0 ? inArray(auditLogsTable.action, filter.actions) : sql`false`);
	}

	if (filter.severities.length > 0) {
		clauses.push(inArray(auditLogsTable.severity, filter.severities));
	}

	if (filter.outcomes.length > 0) {
		clauses.push(inArray(auditLogsTable.outcome, filter.outcomes));
	}

	if (filter.actors.length > 0) {
		clauses.push(inArray(auditLogsTable.actor, filter.actors));
	}

	if (filter.from !== null) {
		clauses.push(gte(auditLogsTable.occurredAt, filter.from));
	}

	if (filter.to !== null) {
		clauses.push(lte(auditLogsTable.occurredAt, filter.to));
	}

	if (filter.search.length > 0) {
		const pattern = `%${escapeLike(filter.search)}%`;

		clauses.push(
			or(
				sql`${auditLogsTable.action} ilike ${pattern}`,
				sql`${auditLogsTable.targetId} ilike ${pattern}`,
				sql`${auditLogsTable.errorCode} ilike ${pattern}`,
				sql`${auditLogsTable.path} ilike ${pattern}`,
				sql`${auditLogsTable.requestId} ilike ${pattern}`,
			),
		);
	}

	return clauses.length > 0 ? and(...clauses) : undefined;
}

const COLUMNS = {
	id: auditLogsTable.id,
	occurredAt: auditLogsTable.occurredAt,
	action: auditLogsTable.action,
	severity: auditLogsTable.severity,
	outcome: auditLogsTable.outcome,
	actor: auditLogsTable.actor,
	targetType: auditLogsTable.targetType,
	targetId: auditLogsTable.targetId,
	errorCode: auditLogsTable.errorCode,
	requestId: auditLogsTable.requestId,
	method: auditLogsTable.method,
	path: auditLogsTable.path,
	durationMs: auditLogsTable.durationMs,
	ipAddress: auditLogsTable.ipAddress,
	userAgent: auditLogsTable.userAgent,
	metadata: auditLogsTable.metadata,
} as const;

@Injectable()
export class AuditRepository {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async insertMany(writes: AuditWrite[]): Promise<void> {
		if (writes.length === 0) {
			return;
		}

		await this.db.insert(auditLogsTable).values(writes);
	}

	async list(filter: AuditFilter, offset: number, limit: number): Promise<AuditRow[]> {
		const rows = await this.db
			.select(COLUMNS)
			.from(auditLogsTable)
			.where(conditions(filter))
			.orderBy(desc(auditLogsTable.occurredAt), desc(auditLogsTable.id))
			.offset(offset)
			.limit(limit);

		return rows as AuditRow[];
	}

	async count(filter: AuditFilter): Promise<number> {
		const [row] = await this.db.select({ total: count() }).from(auditLogsTable).where(conditions(filter));

		return row?.total ?? 0;
	}

	async countBySeverity(filter: AuditFilter): Promise<AuditSeverityCount[]> {
		const rows = await this.db
			.select({ severity: auditLogsTable.severity, count: count() })
			.from(auditLogsTable)
			.where(conditions(filter))
			.groupBy(auditLogsTable.severity);

		return rows as AuditSeverityCount[];
	}

	async bounds(): Promise<AuditBounds> {
		const [row] = await this.db
			.select({ oldestAt: min(auditLogsTable.occurredAt), newestAt: max(auditLogsTable.occurredAt) })
			.from(auditLogsTable);

		return { oldestAt: toDate(row?.oldestAt), newestAt: toDate(row?.newestAt) };
	}

	async deleteOlderThan(cutoff: Date): Promise<number> {
		const rows = await this.db.execute<{ deleted: number }>(
			sql`with removed as (delete from ${auditLogsTable}
				where ${auditLogsTable.occurredAt} < ${sql.param(cutoff, auditLogsTable.occurredAt)} returning 1)
				select count(*)::int as deleted from removed`,
		);

		return rows[0]?.deleted ?? 0;
	}
}

import { AUDIT_ACTORS, AUDIT_OUTCOMES, AUDIT_SEVERITIES } from "@snapshot/contracts";
import { sql } from "drizzle-orm";
import { bigint, index, integer, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const auditSeverityEnum = pgEnum("audit_severity", AUDIT_SEVERITIES);
export const auditOutcomeEnum = pgEnum("audit_outcome", AUDIT_OUTCOMES);
export const auditActorEnum = pgEnum("audit_actor", AUDIT_ACTORS);

export const auditLogsTable = pgTable(
	"audit_logs",
	{
		id: bigint({ mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
		occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		action: varchar({ length: 64 }).notNull(),
		severity: auditSeverityEnum().notNull(),
		outcome: auditOutcomeEnum().notNull(),
		actor: auditActorEnum().notNull(),
		targetType: varchar({ length: 32 }),
		targetId: varchar({ length: 128 }),
		errorCode: varchar({ length: 64 }),
		requestId: varchar({ length: 64 }),
		method: varchar({ length: 10 }),
		path: varchar({ length: 512 }),
		durationMs: integer(),
		ipAddress: varchar({ length: 45 }),
		userAgent: varchar({ length: 255 }),
		metadata: jsonb(),
	},
	(table) => [
		index("audit_logs_occurred_at_idx").on(sql`${table.occurredAt} desc`),
		index("audit_logs_action_occurred_at_idx").on(table.action, sql`${table.occurredAt} desc`),
		index("audit_logs_severity_occurred_at_idx").on(table.severity, sql`${table.occurredAt} desc`),
		index("audit_logs_outcome_occurred_at_idx").on(table.outcome, sql`${table.occurredAt} desc`),
	],
);

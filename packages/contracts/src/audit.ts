import { z } from "zod";

export const AUDIT_SEVERITIES = ["info", "notice", "warning", "error", "critical"] as const;
export const auditSeveritySchema = z.enum(AUDIT_SEVERITIES);
export type AuditSeverity = z.infer<typeof auditSeveritySchema>;

export const AUDIT_OUTCOMES = ["success", "failure"] as const;
export const auditOutcomeSchema = z.enum(AUDIT_OUTCOMES);
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

export const AUDIT_ACTORS = ["dashboard", "api_key", "system", "anonymous"] as const;
export const auditActorSchema = z.enum(AUDIT_ACTORS);
export type AuditActor = z.infer<typeof auditActorSchema>;

export const AUDIT_CATEGORIES = ["auth", "mfa", "account", "config", "api_key", "uploads", "links", "security", "system"] as const;
export const auditCategorySchema = z.enum(AUDIT_CATEGORIES);
export type AuditCategory = z.infer<typeof auditCategorySchema>;

export const AUDIT_TARGET_TYPES = ["upload", "link", "config", "session", "admin", "api_key", "instance"] as const;
export const auditTargetTypeSchema = z.enum(AUDIT_TARGET_TYPES);
export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;

interface AuditActionSpec {
	severity: AuditSeverity;
	failureSeverity?: AuditSeverity;
	target?: AuditTargetType;
}

export const AUDIT_ACTIONS = {
	"auth.setup": { severity: "notice", target: "admin" },
	"auth.sign_in": { severity: "info", failureSeverity: "warning", target: "session" },
	"auth.sign_in_mfa": { severity: "info", failureSeverity: "warning", target: "session" },
	"auth.sign_out": { severity: "info", target: "session" },
	"auth.password_change": { severity: "notice", target: "admin" },
	"auth.sessions_revoke": { severity: "notice", target: "session" },

	"mfa.setup": { severity: "notice", target: "admin" },
	"mfa.setup_cancel": { severity: "info", target: "admin" },
	"mfa.enable": { severity: "notice", target: "admin" },
	"mfa.disable": { severity: "warning", target: "admin" },
	"mfa.recovery_codes_rotate": { severity: "notice", target: "admin" },

	"account.username_change": { severity: "notice", target: "admin" },
	"account.preferences_update": { severity: "info", target: "admin" },

	"config.update": { severity: "notice", target: "config" },

	"api_key.reveal": { severity: "notice", target: "api_key" },
	"api_key.rotate": { severity: "warning", target: "api_key" },

	"uploads.create": { severity: "info", target: "upload" },
	"uploads.delete": { severity: "notice", target: "upload" },

	"links.create": { severity: "info", target: "link" },
	"links.update": { severity: "notice", target: "link" },
	"links.delete": { severity: "notice", target: "link" },

	"security.unauthorized": { severity: "warning" },
	"security.api_key_rejected": { severity: "warning" },
	"security.csrf_rejected": { severity: "warning" },
	"security.rate_limited": { severity: "warning" },

	"system.startup": { severity: "info", target: "instance" },
	"system.uploads_reconciled": { severity: "info", target: "instance" },
	"system.audit_pruned": { severity: "info", target: "instance" },
	"system.audit_overflow": { severity: "error", target: "instance" },
} as const satisfies Record<string, AuditActionSpec>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const AUDIT_ACTION_NAMES = Object.keys(AUDIT_ACTIONS) as AuditAction[];
export const auditActionSchema = z.enum(AUDIT_ACTION_NAMES as [AuditAction, ...AuditAction[]]);

export function auditCategoryOf(action: AuditAction): AuditCategory {
	return action.slice(0, action.indexOf(".")) as AuditCategory;
}

export function auditActionsIn(categories: readonly AuditCategory[]): AuditAction[] {
	const wanted = new Set<string>(categories);

	return AUDIT_ACTION_NAMES.filter((action) => wanted.has(auditCategoryOf(action)));
}

export function auditTargetTypeOf(action: AuditAction): AuditTargetType | null {
	return (AUDIT_ACTIONS[action] as AuditActionSpec).target ?? null;
}

const severityRank: Record<AuditSeverity, number> = { info: 0, notice: 1, warning: 2, error: 3, critical: 4 };

export function maxAuditSeverity(left: AuditSeverity, right: AuditSeverity): AuditSeverity {
	return severityRank[left] >= severityRank[right] ? left : right;
}

export function auditSeverityFor(action: AuditAction, outcome: AuditOutcome): AuditSeverity {
	const spec = AUDIT_ACTIONS[action] as AuditActionSpec;

	return outcome === "success" ? spec.severity : maxAuditSeverity(spec.failureSeverity ?? "warning", spec.severity);
}

export const AUDIT_METADATA_MAX_KEYS = 24;

export const auditEntrySchema = z.object({
	id: z.number().int().positive(),
	occurredAt: z.iso.datetime({ offset: true }),
	action: auditActionSchema,
	category: auditCategorySchema,
	severity: auditSeveritySchema,
	outcome: auditOutcomeSchema,
	actor: auditActorSchema,
	targetType: auditTargetTypeSchema.nullable(),
	targetId: z.string().nullable(),
	errorCode: z.string().nullable(),
	requestId: z.string().nullable(),
	method: z.string().nullable(),
	path: z.string().nullable(),
	durationMs: z.number().int().nonnegative().nullable(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_SEARCH_MAX_LENGTH = 200;

const csvEnum = <T extends string>(schema: z.ZodType<T>) =>
	z.preprocess(
		(value) => (typeof value === "string" ? value.split(",").filter((item) => item.length > 0) : (value ?? [])),
		z.array(schema),
	);

export const auditQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(200).default(AUDIT_PAGE_SIZE),
	categories: csvEnum(auditCategorySchema),
	severities: csvEnum(auditSeveritySchema),
	outcomes: csvEnum(auditOutcomeSchema),
	actors: csvEnum(auditActorSchema),
	from: z.iso.datetime({ offset: true }).nullish().default(null),
	to: z.iso.datetime({ offset: true }).nullish().default(null),
	search: z.string().trim().max(AUDIT_SEARCH_MAX_LENGTH).default(""),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const auditPageSchema = z.object({
	items: z.array(auditEntrySchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().min(1),
	perPage: z.number().int().min(1),
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export const auditSummarySchema = z.object({
	total: z.number().int().nonnegative(),
	bySeverity: z.record(auditSeveritySchema, z.number().int().nonnegative()),
	oldestAt: z.iso.datetime({ offset: true }).nullable(),
	newestAt: z.iso.datetime({ offset: true }).nullable(),
	retentionDays: z.number().int().positive(),
});
export type AuditSummary = z.infer<typeof auditSummarySchema>;

export const AUDIT_RETENTION_MIN_DAYS = 1;
export const AUDIT_RETENTION_MAX_DAYS = 3650;

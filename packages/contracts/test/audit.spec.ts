import { describe, expect, it } from "vitest";

import {
	AUDIT_ACTION_NAMES,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
	AUDIT_SEVERITIES,
	auditActionsIn,
	auditCategoryOf,
	auditQuerySchema,
	auditSeverityFor,
	auditTargetTypeOf,
	maxAuditSeverity,
} from "../src/audit.js";

describe("the action table", () => {
	it.each(AUDIT_ACTION_NAMES)("%s sits in a declared category", (action) => {
		expect(AUDIT_CATEGORIES).toContain(auditCategoryOf(action));
	});

	it.each(AUDIT_ACTION_NAMES)("%s declares a known severity", (action) => {
		expect(AUDIT_SEVERITIES).toContain(AUDIT_ACTIONS[action].severity);
	});

	it("covers every category with at least one action", () => {
		for (const category of AUDIT_CATEGORIES) {
			expect(auditActionsIn([category]).length).toBeGreaterThan(0);
		}
	});

	it("names every action <category>.<verb>", () => {
		for (const action of AUDIT_ACTION_NAMES) {
			expect(action.split(".")).toHaveLength(2);
		}
	});
});

describe("auditActionsIn", () => {
	it("expands a category to exactly its actions", () => {
		expect(auditActionsIn(["links"])).toEqual(["links.create", "links.update", "links.delete"]);
	});

	it("merges several categories", () => {
		expect(auditActionsIn(["config", "api_key"])).toEqual(["config.update", "api_key.reveal", "api_key.rotate"]);
	});

	it("is empty for no categories", () => {
		expect(auditActionsIn([])).toEqual([]);
	});
});

describe("auditSeverityFor", () => {
	it("uses the declared severity on success", () => {
		expect(auditSeverityFor("uploads.create", "success")).toBe("info");
	});

	it("escalates a routine action to a warning when it fails", () => {
		expect(auditSeverityFor("auth.sign_in", "failure")).toBe("warning");
	});

	it("never demotes an action that is already above warning", () => {
		expect(auditSeverityFor("system.audit_overflow", "failure")).toBe("error");
	});

	it.each(AUDIT_ACTION_NAMES)("%s never gets less severe by failing", (action) => {
		const success = auditSeverityFor(action, "success");

		expect(auditSeverityFor(action, "failure")).toBe(maxAuditSeverity(success, auditSeverityFor(action, "failure")));
	});
});

describe("auditTargetTypeOf", () => {
	it("reads the target the action declares", () => {
		expect(auditTargetTypeOf("links.delete")).toBe("link");
	});

	it("is null for an action that touches nothing addressable", () => {
		expect(auditTargetTypeOf("security.rate_limited")).toBeNull();
	});
});

describe("auditQuerySchema", () => {
	it("splits comma separated filters", () => {
		const parsed = auditQuerySchema.parse({ categories: "auth,security", severities: "warning" });

		expect(parsed.categories).toEqual(["auth", "security"]);
		expect(parsed.severities).toEqual(["warning"]);
	});

	it("defaults to an unfiltered first page", () => {
		expect(auditQuerySchema.parse({})).toMatchObject({
			page: 1,
			perPage: 50,
			categories: [],
			severities: [],
			outcomes: [],
			actors: [],
			from: null,
			to: null,
			search: "",
		});
	});

	it("rejects a category it does not know", () => {
		expect(auditQuerySchema.safeParse({ categories: "auth,nonsense" }).success).toBe(false);
	});

	it("caps perPage", () => {
		expect(auditQuerySchema.safeParse({ perPage: "5000" }).success).toBe(false);
	});

	it("requires an offset-bearing timestamp for the range", () => {
		expect(auditQuerySchema.safeParse({ from: "2026-09-06" }).success).toBe(false);
		expect(auditQuerySchema.safeParse({ from: "2026-09-06T10:00:00Z" }).success).toBe(true);
	});
});

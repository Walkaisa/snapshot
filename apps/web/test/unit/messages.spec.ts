import {
	AUDIT_ACTION_NAMES,
	AUDIT_ACTORS,
	AUDIT_CATEGORIES,
	AUDIT_OUTCOMES,
	AUDIT_SEVERITIES,
	AUDIT_TARGET_TYPES,
} from "@snapshot/contracts";
import { describe, expect, it } from "vitest";
import { navGroups } from "@/components/layout/nav-items";
import { locales } from "@/i18n/config";
import { AUDIT_RANGE_HOURS } from "@/lib/audit-range";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

function flatten(value: Messages, prefix = ""): string[] {
	return Object.entries(value).flatMap(([key, entry]) =>
		typeof entry === "object" && entry !== null ? flatten(entry as Messages, `${prefix}${key}.`) : [`${prefix}${key}`],
	);
}

function read(value: Messages, path: string): unknown {
	return path.split(".").reduce<unknown>((current, segment) => (current as Messages | undefined)?.[segment], value);
}

const enKeys = flatten(en as Messages);
const deKeys = flatten(de as Messages);

describe("messages", () => {
	it("covers every locale in i18n/config", () => {
		expect([...locales].sort()).toEqual(["de", "en"]);
	});

	it("has the same key set in both languages", () => {
		expect(deKeys.sort()).toEqual([...enKeys].sort());
	});

	it("names the audit log consistently", () => {
		expect(de.nav.audit).toBe("Audit-Log");
		expect(en.nav.audit).toBe("Audit-Log");
	});

	it("leaves nothing blank", () => {
		for (const key of enKeys) {
			expect(String(read(en as Messages, key) ?? "").trim(), `en.${key}`).not.toBe("");
			expect(String(read(de as Messages, key) ?? "").trim(), `de.${key}`).not.toBe("");
		}
	});

	it("translates every audit action, category, severity, outcome and actor", () => {
		const expected = [
			...AUDIT_ACTION_NAMES.map((action) => `audit.actions.${action}`),
			...AUDIT_CATEGORIES.map((category) => `audit.categories.${category}`),
			...AUDIT_SEVERITIES.map((severity) => `audit.severities.${severity}`),
			...AUDIT_OUTCOMES.map((outcome) => `audit.outcomes.${outcome}`),
			...AUDIT_ACTORS.map((actor) => `audit.actors.${actor}`),
			...AUDIT_TARGET_TYPES.map((target) => `audit.targets.${target}`),
		];

		for (const key of expected) {
			expect(enKeys, key).toContain(key);
		}
	});

	it("translates every audit time range the toolbar offers", () => {
		for (const hours of AUDIT_RANGE_HOURS) {
			expect(enKeys, `audit.range.options.${hours}`).toContain(`audit.range.options.${hours}`);
		}
	});

	it("translates every sidebar label and group", () => {
		for (const group of navGroups) {
			if (group.labelKey) {
				expect(enKeys, `nav.groups.${group.labelKey}`).toContain(`nav.groups.${group.labelKey}`);
			}

			for (const item of group.items) {
				expect(enKeys, `nav.${item.labelKey}`).toContain(`nav.${item.labelKey}`);
				expect(enKeys, `nav.subtitle.${item.labelKey}`).toContain(`nav.subtitle.${item.labelKey}`);
			}
		}
	});
});

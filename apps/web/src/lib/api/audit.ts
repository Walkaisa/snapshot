import type { AuditPage, AuditQuery, AuditSummary } from "@snapshot/contracts";
import { AUDIT_PAGE_SIZE } from "@snapshot/contracts";

import { clientApi } from "./client";

export type AuditFilters = Pick<AuditQuery, "categories" | "severities" | "outcomes" | "actors" | "search"> & {
	from: string | null;
	to: string | null;
};

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
	categories: [],
	severities: [],
	outcomes: [],
	actors: [],
	search: "",
	from: null,
	to: null,
};

export function auditQueryString(filters: AuditFilters, page?: number): string {
	const query = new URLSearchParams();

	if (page !== undefined) {
		query.set("page", String(page));
		query.set("perPage", String(AUDIT_PAGE_SIZE));
	}

	for (const [key, value] of Object.entries({
		categories: filters.categories,
		severities: filters.severities,
		outcomes: filters.outcomes,
		actors: filters.actors,
	})) {
		if (value.length > 0) {
			query.set(key, value.join(","));
		}
	}

	if (filters.search.length > 0) {
		query.set("search", filters.search);
	}

	if (filters.from !== null) {
		query.set("from", filters.from);
	}

	if (filters.to !== null) {
		query.set("to", filters.to);
	}

	return query.toString();
}

export function auditPagePath(filters: AuditFilters, page: number): string {
	return `/api/audit?${auditQueryString(filters, page)}`;
}

export function auditSummaryPath(filters: AuditFilters): string {
	const query = auditQueryString(filters);

	return query.length > 0 ? `/api/audit/summary?${query}` : "/api/audit/summary";
}

export function fetchAuditPage(filters: AuditFilters, page: number): Promise<AuditPage> {
	return clientApi<AuditPage>(auditPagePath(filters, page));
}

export function fetchAuditSummary(filters: AuditFilters): Promise<AuditSummary> {
	return clientApi<AuditSummary>(auditSummaryPath(filters));
}

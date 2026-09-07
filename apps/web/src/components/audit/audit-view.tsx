"use client";

import type { AuditSeverity } from "@snapshot/contracts";
import { ScrollText, SearchX } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditSummary, useInfiniteAudit } from "@/hooks/use-audit";
import { type AuditFilters, EMPTY_AUDIT_FILTERS } from "@/lib/api/audit";
import { DEFAULT_AUDIT_RANGE_HOURS, rangeStart } from "@/lib/audit-range";
import { cn } from "@/lib/utils";
import { AuditRetentionMenu } from "./audit-retention-menu";
import { AuditRow } from "./audit-row";
import { AuditSummaryBar } from "./audit-summary-bar";
import { AuditToolbar, activeFilterCount } from "./audit-toolbar";

const SEARCH_DEBOUNCE_MS = 300;

function AuditEmpty({ filtered }: { filtered: boolean }) {
	const t = useTranslations("audit.empty");
	const Icon = filtered ? SearchX : ScrollText;
	const key = filtered ? "noMatches" : "none";

	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
				<Icon className="size-6" />
			</div>
			<div className="flex flex-col gap-1">
				<p className="font-medium">{t(`${key}.title`)}</p>
				<p className="max-w-sm text-muted-foreground text-sm">{t(`${key}.description`)}</p>
			</div>
		</div>
	);
}

export function AuditView({ initialFrom }: { initialFrom: string }) {
	const t = useTranslations("audit");
	const format = useFormatter();

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [rangeHours, setRangeHours] = useState<number>(DEFAULT_AUDIT_RANGE_HOURS);
	const [from, setFrom] = useState<string | null>(initialFrom);
	const [selection, setSelection] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [search]);

	const filters = useMemo<AuditFilters>(
		() => ({ ...selection, search: debouncedSearch, from, to: null }),
		[selection, debouncedSearch, from],
	);

	const { data, isPending, isError, isFetching, isPlaceholderData, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteAudit(filters);
	const { data: summary, refetch: refetchSummary, isFetching: isFetchingSummary } = useAuditSummary(filters);

	const items = useMemo(() => (data ? data.pages.flatMap((page) => page.items) : []), [data]);
	const total = data?.pages[0]?.total ?? 0;
	const filtered = activeFilterCount(selection) > 0 || debouncedSearch.length > 0;

	function toggleSeverity(severity: AuditSeverity): void {
		setSelection((previous) => ({
			...previous,
			severities: previous.severities.includes(severity)
				? previous.severities.filter((item) => item !== severity)
				: [...previous.severities, severity],
		}));
	}

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	return (
		<div className="flex flex-col gap-5">
			<AuditSummaryBar summary={summary} selected={selection.severities} onToggle={toggleSeverity} />

			<AuditToolbar
				filters={filters}
				onFilters={(next) => setSelection({ ...next, search: "", from: null, to: null })}
				search={search}
				onSearch={setSearch}
				rangeHours={rangeHours}
				refreshing={isFetching || isFetchingSummary}
				onRefresh={() => {
					void refetch();
					void refetchSummary();
				}}
				onRangeHours={(hours) => {
					setRangeHours(hours);
					setFrom(rangeStart(hours));
				}}
			/>

			<div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-sm">
				<p>{t("count", { count: total })}</p>
				{summary === undefined ? null : <AuditRetentionMenu days={summary.retentionDays} />}
			</div>

			{isPending ? (
				<div className="grid gap-2">
					{["a", "b", "c", "d", "e", "f"].map((key) => (
						<Skeleton key={key} className="h-16 rounded-xl" />
					))}
				</div>
			) : items.length === 0 ? (
				<AuditEmpty filtered={filtered} />
			) : (
				<div className={cn("flex flex-col gap-4", isPlaceholderData && "opacity-60")}>
					<ul className="divide-y overflow-hidden rounded-xl border bg-card">
						{items.map((entry) => (
							<AuditRow key={entry.id} entry={entry} />
						))}
					</ul>
					{hasNextPage ? (
						<div className="flex justify-center">
							<Button type="button" variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
								{isFetchingNextPage ? t("loadingMore") : t("loadMore")}
							</Button>
						</div>
					) : null}
				</div>
			)}

			{summary?.oldestAt === null || summary === undefined ? null : (
				<p className="text-muted-foreground text-xs">
					{t("oldest", { date: format.dateTime(new Date(summary.oldestAt), "precise") })}
				</p>
			)}
		</div>
	);
}

"use client";

import type { AuditSeverity, AuditSummary } from "@snapshot/contracts";
import { AUDIT_SEVERITIES } from "@snapshot/contracts";
import { useFormatter, useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SEVERITY_STYLES } from "./audit-tokens";

export function AuditSummaryBar({
	summary,
	selected,
	onToggle,
}: {
	summary: AuditSummary | undefined;
	selected: AuditSeverity[];
	onToggle: (severity: AuditSeverity) => void;
}) {
	const t = useTranslations("audit");
	const format = useFormatter();

	if (summary === undefined) {
		return (
			<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
				{AUDIT_SEVERITIES.map((severity) => (
					<Skeleton key={severity} className="h-16 rounded-xl" />
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
			{AUDIT_SEVERITIES.map((severity) => {
				const style = SEVERITY_STYLES[severity];
				const Icon = style.icon;
				const active = selected.includes(severity);

				return (
					<button
						key={severity}
						type="button"
						aria-pressed={active}
						onClick={() => onToggle(severity)}
						className={cn(
							"flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left outline-none transition-colors",
							"hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
							active && "border-foreground/25 bg-muted/60",
						)}
					>
						<span
							className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", style.surface)}
						>
							<Icon className="size-4" />
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="font-semibold text-lg tabular-nums leading-none">
								{format.number(summary.bySeverity[severity] ?? 0)}
							</span>
							<span className="truncate text-muted-foreground text-xs">{t(`severities.${severity}`)}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

"use client";

import type { AuditEntry } from "@snapshot/contracts";
import { ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";

import { parseUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";
import { ACTOR_ICONS, CATEGORY_ICONS, OUTCOME_STYLES, SEVERITY_STYLES } from "./audit-tokens";

const RESOURCE_KEYS = ["filename", "slug", "shortUrl"] as const;

function shortPath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

function resourceOf(entry: AuditEntry): string | null {
	const metadata = entry.metadata ?? {};

	for (const key of RESOURCE_KEYS) {
		const value = metadata[key];

		if (typeof value === "string" && value.length > 0) {
			return key === "shortUrl" ? shortPath(value) : value;
		}
	}

	return entry.targetId;
}

function routeOf(entry: AuditEntry): string | null {
	return entry.path === null ? null : `${entry.method ?? ""} ${entry.path}`.trim();
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid min-w-0 gap-1">
			<dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
			<dd className="wrap-break-word min-w-0 text-sm">{children}</dd>
		</div>
	);
}

function MetadataFields({ metadata }: { metadata: Record<string, unknown> }) {
	const t = useTranslations("audit");

	return (
		<>
			{Object.entries(metadata).map(([key, value]) => (
				<Field key={key} label={t.has(`fields.${key}`) ? t(`fields.${key}`) : key}>
					<span className={typeof value === "number" ? "tabular-nums" : "font-mono text-xs"}>
						{value === null ? t("details.unknown") : String(value)}
					</span>
				</Field>
			))}
		</>
	);
}

export function AuditRow({ entry }: { entry: AuditEntry }) {
	const t = useTranslations("audit");
	const format = useFormatter();
	const panelId = useId();
	const [open, setOpen] = useState(false);

	const severity = SEVERITY_STYLES[entry.severity];
	const outcome = OUTCOME_STYLES[entry.outcome];
	const SeverityIcon = severity.icon;
	const OutcomeIcon = outcome.icon;
	const CategoryIcon = CATEGORY_ICONS[entry.category];
	const ActorIcon = ACTOR_ICONS[entry.actor];

	const occurredAt = new Date(entry.occurredAt);
	const resource = resourceOf(entry);
	const route = routeOf(entry);
	const agent = parseUserAgent(entry.userAgent);
	const client =
		agent.browser !== null && agent.os !== null
			? t("details.device", { browser: agent.browser, os: agent.os })
			: (agent.browser ?? agent.os ?? entry.userAgent);

	return (
		<li className="relative">
			<span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5", severity.rail)} />
			<button
				type="button"
				onClick={() => setOpen((previous) => !previous)}
				aria-expanded={open}
				aria-controls={panelId}
				className="flex w-full items-center gap-3 py-3 pr-3 pl-4 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:gap-4 sm:pr-4"
			>
				<span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", severity.surface)}>
					<SeverityIcon className="size-4" />
				</span>

				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex min-w-0 items-baseline gap-2">
						<span className="truncate font-medium text-sm">{t(`actions.${entry.action}`)}</span>
						{resource === null ? null : <span className="truncate font-mono text-muted-foreground text-xs">{resource}</span>}
					</span>
					{route === null ? null : <span className="truncate font-mono text-muted-foreground/70 text-xs">{route}</span>}
				</span>

				<span className="hidden w-40 shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
					<time dateTime={entry.occurredAt} className="text-muted-foreground tabular-nums">
						{format.dateTime(occurredAt, "precise")}
					</time>
					<span className="text-muted-foreground/70">{format.relativeTime(occurredAt)}</span>
				</span>

				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>

			{open ? (
				<div id={panelId} className="border-t bg-muted/25 px-4 py-4">
					<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Field label={t("details.occurredAt")}>
							<span className="tabular-nums">{format.dateTime(occurredAt, "precise")}</span>
						</Field>
						<Field label={t("details.outcome")}>
							<span className={cn("inline-flex items-center gap-1.5 font-medium", outcome.text)}>
								<OutcomeIcon className="size-3.5" />
								{t(`outcomes.${entry.outcome}`)}
							</span>
						</Field>
						<Field label={t("details.severity")}>
							<span className={cn("inline-flex items-center gap-1.5 font-medium", severity.text)}>
								<SeverityIcon className="size-3.5" />
								{t(`severities.${entry.severity}`)}
							</span>
						</Field>
						<Field label={t("details.category")}>
							<span className="inline-flex items-center gap-1.5">
								<CategoryIcon className="size-3.5 text-muted-foreground" />
								{t(`categories.${entry.category}`)}
							</span>
						</Field>
						<Field label={t("details.actor")}>
							<span className="inline-flex items-center gap-1.5">
								<ActorIcon className="size-3.5 text-muted-foreground" />
								{t(`actors.${entry.actor}`)}
							</span>
						</Field>
						{entry.targetType === null ? null : (
							<Field label={t("details.target")}>
								<span className="font-mono text-xs">{entry.targetId ?? "—"}</span>
								<span className="ml-2 text-muted-foreground text-xs">{t(`targets.${entry.targetType}`)}</span>
							</Field>
						)}
						<Field label={t("details.ipAddress")}>
							<span className="font-mono text-xs">{entry.ipAddress ?? t("details.unknown")}</span>
						</Field>
						<Field label={t("details.client")}>
							<span title={entry.userAgent ?? undefined}>{client ?? t("details.unknown")}</span>
						</Field>
						{route === null ? null : (
							<Field label={t("details.route")}>
								<span className="font-mono text-xs">{route}</span>
							</Field>
						)}
						{entry.durationMs === null ? null : (
							<Field label={t("details.duration")}>
								<span className="tabular-nums">{`${entry.durationMs} ms`}</span>
							</Field>
						)}
						{entry.errorCode === null ? null : (
							<Field label={t("details.errorCode")}>
								<span className="font-mono text-destructive text-xs">{entry.errorCode}</span>
							</Field>
						)}
						{entry.requestId === null ? null : (
							<Field label={t("details.requestId")}>
								<span className="font-mono text-xs">{entry.requestId}</span>
							</Field>
						)}
					</dl>

					{entry.metadata === null ? null : (
						<div className="mt-4 border-t pt-4">
							<p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{t("details.changed")}</p>
							<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<MetadataFields metadata={entry.metadata} />
							</dl>
						</div>
					)}
				</div>
			) : null}
		</li>
	);
}

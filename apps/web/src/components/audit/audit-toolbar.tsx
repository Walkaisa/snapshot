"use client";

import type { AuditActor, AuditCategory, AuditOutcome, AuditSeverity } from "@snapshot/contracts";
import { AUDIT_ACTORS, AUDIT_CATEGORIES, AUDIT_OUTCOMES, AUDIT_SEVERITIES } from "@snapshot/contracts";
import { ListFilter, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { RangePicker } from "@/components/dashboard/range-picker";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { AuditFilters } from "@/lib/api/audit";
import { AUDIT_RANGE_HOURS } from "@/lib/audit-range";

function toggle<T extends string>(values: T[], value: T): T[] {
	return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function activeFilterCount(filters: AuditFilters): number {
	return filters.categories.length + filters.severities.length + filters.outcomes.length + filters.actors.length;
}

export function AuditToolbar({
	filters,
	onFilters,
	search,
	onSearch,
	rangeHours,
	onRangeHours,
	onRefresh,
	refreshing,
}: {
	filters: AuditFilters;
	onFilters: (filters: AuditFilters) => void;
	search: string;
	onSearch: (search: string) => void;
	rangeHours: number;
	onRangeHours: (hours: number) => void;
	onRefresh: () => void;
	refreshing: boolean;
}) {
	const t = useTranslations("audit");
	const active = activeFilterCount(filters);

	const groups = [
		{ key: "severities" as const, options: AUDIT_SEVERITIES, labelKey: "severities" },
		{ key: "categories" as const, options: AUDIT_CATEGORIES, labelKey: "categories" },
		{ key: "outcomes" as const, options: AUDIT_OUTCOMES, labelKey: "outcomes" },
		{ key: "actors" as const, options: AUDIT_ACTORS, labelKey: "actors" },
	];

	function set<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]): void {
		onFilters({ ...filters, [key]: value });
	}

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<InputGroup className="lg:max-w-sm lg:flex-1">
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput
					type="search"
					value={search}
					onChange={(event) => onSearch(event.target.value)}
					placeholder={t("searchPlaceholder")}
					aria-label={t("search")}
				/>
			</InputGroup>

			<div className="flex flex-wrap items-center gap-2">
				<Button type="button" variant="outline" size="icon" aria-label={t("refresh")} onClick={onRefresh} disabled={refreshing}>
					<RefreshCw className={refreshing ? "animate-spin" : undefined} />
				</Button>

				<RangePicker
					label={t("range.label")}
					name="audit-range"
					value={rangeHours}
					onChange={onRangeHours}
					options={AUDIT_RANGE_HOURS.map((hours) => ({ value: hours, label: t(`range.options.${hours}`) }))}
				/>

				<DropdownMenu>
					<DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
						<ListFilter />
						{t("filters.label")}
						{active > 0 ? (
							<span className="ml-0.5 rounded-full bg-primary px-1.5 font-medium text-primary-foreground text-xs tabular-nums">
								{active}
							</span>
						) : null}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
						{groups.map((group, index) => (
							<DropdownMenuGroup key={group.key}>
								{index > 0 ? <DropdownMenuSeparator /> : null}
								<DropdownMenuLabel>{t(`filters.${group.labelKey}`)}</DropdownMenuLabel>
								{group.options.map((option) => (
									<DropdownMenuCheckboxItem
										key={option}
										closeOnClick={false}
										checked={(filters[group.key] as string[]).includes(option)}
										onCheckedChange={() =>
											set(
												group.key,
												toggle(
													filters[group.key] as (AuditSeverity | AuditCategory | AuditOutcome | AuditActor)[],
													option,
												) as never,
											)
										}
									>
										{t(`${group.labelKey}.${option}`)}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuGroup>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{active > 0 || search.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							onSearch("");
							onFilters({ ...filters, categories: [], severities: [], outcomes: [], actors: [] });
						}}
					>
						<RotateCcw />
						{t("filters.reset")}
					</Button>
				) : null}
			</div>
		</div>
	);
}

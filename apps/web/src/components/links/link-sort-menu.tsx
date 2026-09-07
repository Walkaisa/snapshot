"use client";

import type { LinkSortField, SortOrder } from "@snapshot/contracts";
import { ArrowDownUp, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface LinkSort {
	field: LinkSortField;
	order: SortOrder;
}

export const LINK_SORT_PRESETS = [
	{ key: "newest", field: "createdAt", order: "desc" },
	{ key: "oldest", field: "createdAt", order: "asc" },
	{ key: "visits", field: "visits", order: "desc" },
	{ key: "slug", field: "slug", order: "asc" },
	{ key: "target", field: "targetUrl", order: "asc" },
] as const satisfies readonly (LinkSort & { key: string })[];

export const DEFAULT_LINK_SORT: LinkSort = { field: "createdAt", order: "desc" };

export function LinkSortMenu({ sort, onSort }: { sort: LinkSort; onSort: (sort: LinkSort) => void }) {
	const t = useTranslations("links.list.sort");
	const active = LINK_SORT_PRESETS.find((preset) => preset.field === sort.field && preset.order === sort.order);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
				<ArrowDownUp />
				{t(`options.${active?.key ?? "newest"}`)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{LINK_SORT_PRESETS.map((preset) => (
					<DropdownMenuItem key={preset.key} onClick={() => onSort({ field: preset.field, order: preset.order })}>
						{preset.key === active?.key ? <Check /> : <span className="size-4" aria-hidden="true" />}
						{t(`options.${preset.key}`)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

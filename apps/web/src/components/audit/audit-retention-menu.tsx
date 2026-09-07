"use client";

import { Check, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateConfig } from "@/hooks/use-config";
import { ApiError } from "@/lib/api/types";

export const AUDIT_RETENTION_OPTIONS = [7, 30, 90, 180, 365] as const;

export function AuditRetentionMenu({ days }: { days: number }) {
	const t = useTranslations("audit.retentionMenu");
	const update = useUpdateConfig();

	async function choose(next: number): Promise<void> {
		if (next === days) {
			return;
		}

		try {
			await update.mutateAsync({ auditRetentionDays: next });
			toast.success(t("saved", { days: next }));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("error"));
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" disabled={update.isPending} />}>
				<Clock />
				{t("label", { days })}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
					{AUDIT_RETENTION_OPTIONS.map((option) => (
						<DropdownMenuItem key={option} onClick={() => void choose(option)}>
							{option === days ? <Check /> : <span className="size-4" aria-hidden="true" />}
							{t("option", { days: option })}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

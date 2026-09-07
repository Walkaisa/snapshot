"use client";

import type { Link } from "@snapshot/contracts";
import { Copy, EllipsisVertical, ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LinkActionsMenu({ link, onEdit, onDelete }: { link: Link; onEdit: (link: Link) => void; onDelete: (link: Link) => void }) {
	const t = useTranslations("links.actions");

	async function copyShortUrl(): Promise<void> {
		try {
			await navigator.clipboard.writeText(link.shortUrl);
			toast.success(t("copied"));
		} catch {
			toast.error(t("copyError"));
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("more")} />}>
				<EllipsisVertical />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => void copyShortUrl()}>
					<Copy />
					{t("copy")}
				</DropdownMenuItem>
				<DropdownMenuItem render={<a href={link.targetUrl} target="_blank" rel="noopener noreferrer" />}>
					<ExternalLink />
					{t("openTarget")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onEdit(link)}>
					<PencilLine />
					{t("edit")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={() => onDelete(link)}>
					<Trash2 />
					{t("delete")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

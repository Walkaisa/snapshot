"use client";

import type { Upload } from "@snapshot/contracts";
import type { VariantProps } from "class-variance-authority";
import { Copy, Download, EllipsisVertical, ExternalLink, Info, Link2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

export function UploadActionsMenu({
	upload,
	onDelete,
	onOpenDetails,
	triggerVariant = "ghost",
}: {
	upload: Upload;
	onDelete: (upload: Upload) => void;
	onOpenDetails?: (upload: Upload) => void;
	triggerVariant?: ButtonVariant;
}) {
	const t = useTranslations("gallery.actions");

	async function copy(value: string, message: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(message);
		} catch {
			toast.error(t("copyError"));
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button type="button" variant={triggerVariant} size="icon-sm" aria-label={t("more")} />}>
				<EllipsisVertical />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{onOpenDetails ? (
					<DropdownMenuItem onClick={() => onOpenDetails(upload)}>
						<Info />
						{t("details")}
					</DropdownMenuItem>
				) : null}
				<DropdownMenuItem onClick={() => void copy(upload.pageUrl, t("linkCopied"))}>
					<Link2 />
					{t("copyLink")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => void copy(upload.rawUrl, t("directCopied"))}>
					<Copy />
					{t("copyDirect")}
				</DropdownMenuItem>
				<DropdownMenuItem render={<a href={upload.pageUrl} target="_blank" rel="noopener noreferrer" />}>
					<ExternalLink />
					{t("open")}
				</DropdownMenuItem>
				<DropdownMenuItem render={<a href={`${upload.rawUrl}?download=1`} />}>
					<Download />
					{t("download")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={() => onDelete(upload)}>
					<Trash2 />
					{t("delete")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

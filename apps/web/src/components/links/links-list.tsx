"use client";

import type { Link } from "@snapshot/contracts";
import { Copy, Eye } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LinkActionsMenu } from "./link-actions-menu";

function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function destinationLabel(url: string): string {
	return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function monogram(url: string): string {
	return hostOf(url).slice(0, 1).toUpperCase() || "?";
}

function LinkRow({ link, onEdit, onDelete }: { link: Link; onEdit: (link: Link) => void; onDelete: (link: Link) => void }) {
	const t = useTranslations("links");
	const format = useFormatter();

	async function copyShortUrl(): Promise<void> {
		try {
			await navigator.clipboard.writeText(link.shortUrl);
			toast.success(t("actions.copied"));
		} catch {
			toast.error(t("actions.copyError"));
		}
	}

	return (
		<li className="group/link flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-4">
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-medium text-sm ring-1 ring-border ring-inset"
			>
				{monogram(link.targetUrl)}
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-1">
					<a
						href={link.shortUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="truncate font-medium font-mono text-sm underline-offset-4 hover:underline"
					>
						/{link.slug}
					</a>
					<span className="opacity-0 transition-opacity group-focus-within/link:opacity-100 group-hover/link:opacity-100">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={t("actions.copy")}
							onClick={() => void copyShortUrl()}
						>
							<Copy />
						</Button>
					</span>
				</div>
				<a
					href={link.targetUrl}
					target="_blank"
					rel="noopener noreferrer"
					title={link.targetUrl}
					className="truncate text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
				>
					{destinationLabel(link.targetUrl)}
				</a>
				<div className="flex items-center gap-3 pt-1 text-muted-foreground text-xs sm:hidden">
					<span className="flex items-center gap-1 tabular-nums">
						<Eye className="size-3.5" />
						{format.number(link.visits)}
					</span>
					<span>{format.relativeTime(new Date(link.createdAt))}</span>
				</div>
			</div>

			<div className="hidden shrink-0 items-center gap-4 sm:flex">
				<span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums" title={t("columns.visits")}>
					<Eye className="size-3.5" />
					{format.number(link.visits)}
				</span>
				<span className="w-24 text-right text-muted-foreground text-xs">{format.relativeTime(new Date(link.createdAt))}</span>
			</div>

			<LinkActionsMenu link={link} onEdit={onEdit} onDelete={onDelete} />
		</li>
	);
}

export function LinksList({ links, onEdit, onDelete }: { links: Link[]; onEdit: (link: Link) => void; onDelete: (link: Link) => void }) {
	return (
		<ul className="divide-y overflow-hidden rounded-xl border bg-card">
			{links.map((link) => (
				<LinkRow key={link.slug} link={link} onEdit={onEdit} onDelete={onDelete} />
			))}
		</ul>
	);
}

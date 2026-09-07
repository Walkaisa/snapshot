"use client";

import type { Link as ShortLink, Upload } from "@snapshot/contracts";
import { ChevronRight, Link2 } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

import { UploadThumbnail } from "@/components/gallery/upload-thumbnail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentLinks, useRecentUploads } from "@/hooks/use-dashboard";
import { DashboardError } from "./dashboard-error";

const FEED_LIMIT = 6;
const ROW_CLASS =
	"flex items-center gap-3 px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

interface FeedEntry {
	key: string;
	createdAt: string;
	href: string;
	title: string;
	meta: string;
	visual: React.ReactNode;
}

function uploadEntry(upload: Upload): FeedEntry {
	return {
		key: `upload-${upload.id}`,
		createdAt: upload.createdAt,
		href: `/${upload.id}`,
		title: `${upload.id}.${upload.extension}`,
		meta: `${upload.sizeHuman} · ${upload.mimeType}`,
		visual: (
			<span className="size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10">
				<UploadThumbnail upload={upload} iconClassName="size-4" />
			</span>
		),
	};
}

function linkEntry(link: ShortLink, visitsLabel: string): FeedEntry {
	return {
		key: `link-${link.slug}`,
		createdAt: link.createdAt,
		href: "/links",
		title: `/${link.slug}`,
		meta: `${visitsLabel} · ${link.targetUrl}`,
		visual: (
			<span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground ring-1 ring-foreground/10">
				<Link2 className="size-4" />
			</span>
		),
	};
}

function FeedRow({ entry }: { entry: FeedEntry }) {
	const format = useFormatter();

	return (
		<li>
			<Link href={entry.href} className={ROW_CLASS}>
				{entry.visual}
				<span className="min-w-0 flex-1">
					<span className="block truncate font-medium text-sm">{entry.title}</span>
					<span className="block truncate text-muted-foreground text-xs">{entry.meta}</span>
				</span>
				<span className="shrink-0 text-muted-foreground text-xs">{format.relativeTime(new Date(entry.createdAt))}</span>
				<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
			</Link>
		</li>
	);
}

export function RecentActivity() {
	const t = useTranslations("overview.recent");
	const uploads = useRecentUploads();
	const links = useRecentLinks();

	const entries = useMemo(() => {
		const merged = [
			...(uploads.data?.items ?? []).map(uploadEntry),
			...(links.data?.items ?? []).map((link) => linkEntry(link, t("visits", { count: link.visits }))),
		];

		return merged.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, FEED_LIMIT);
	}, [uploads.data, links.data, t]);

	const isError = uploads.isError || links.isError;
	const isPending = uploads.isPending || links.isPending;

	function retry(): void {
		void uploads.refetch();
		void links.refetch();
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("title")}</CardTitle>
				<CardDescription>{t("description")}</CardDescription>
			</CardHeader>
			<CardContent>
				{isError ? (
					<DashboardError onRetry={retry} />
				) : isPending ? (
					<div className="grid gap-2">
						{["a", "b", "c", "d", "e"].map((key) => (
							<Skeleton key={key} className="h-15 w-full rounded-lg" />
						))}
					</div>
				) : entries.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t("empty")}</p>
				) : (
					<ul className="divide-y overflow-hidden rounded-lg border">
						{entries.map((entry) => (
							<FeedRow key={entry.key} entry={entry} />
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

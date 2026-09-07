"use client";

import type { Upload } from "@snapshot/contracts";
import { CloudUpload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteUpload, useInfiniteUploads } from "@/hooks/use-gallery";
import { ApiError } from "@/lib/api/types";
import { GalleryEmpty } from "./gallery-empty";
import { GallerySkeleton } from "./gallery-skeleton";
import { UploadDetailDialog } from "./upload-detail-dialog";
import { UploadDialog } from "./upload-dialog";
import { UploadMasonry } from "./upload-masonry";

export function GalleryView({ baseUrl }: { baseUrl: string }) {
	const t = useTranslations("gallery");
	const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUploads();
	const remove = useDeleteUpload();

	const [selected, setSelected] = useState<Upload | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Upload | null>(null);
	const [uploadOpen, setUploadOpen] = useState(false);

	const items = useMemo(() => (data ? data.pages.flatMap((page) => page.items) : []), [data]);
	const total = data?.pages[0]?.total ?? 0;

	const sentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const node = sentinelRef.current;

		if (node === null || !hasNextPage) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					void fetchNextPage();
				}
			},
			{ rootMargin: "800px" },
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	async function onConfirmDelete(): Promise<void> {
		if (deleteTarget === null) {
			return;
		}

		try {
			const removed = await remove.mutateAsync(deleteTarget.id);

			if (selected?.id === removed.id) {
				setSelected(null);
			}

			setDeleteTarget(null);
			toast.success(t("actions.deleted"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("actions.deleteError"));
		}
	}

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	const uploadDialog = <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} baseUrl={baseUrl} />;

	if (isPending) {
		return <GallerySkeleton />;
	}

	if (total === 0) {
		return (
			<>
				<GalleryEmpty onUpload={() => setUploadOpen(true)} />
				{uploadDialog}
			</>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">{t("count", { count: total })}</p>
				<Button type="button" onClick={() => setUploadOpen(true)}>
					<CloudUpload />
					{t("upload.action")}
				</Button>
			</div>

			<UploadMasonry uploads={items} onOpenDetails={setSelected} onDelete={setDeleteTarget} />

			<div ref={sentinelRef} aria-hidden="true" className="h-px" />

			{isFetchingNextPage ? (
				<div className="flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm">
					<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					{t("loadingMore")}
				</div>
			) : null}

			{uploadDialog}
			<UploadDetailDialog upload={selected} onClose={() => setSelected(null)} onDelete={setDeleteTarget} />
			<ConfirmDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
				title={t("confirmDelete.title")}
				description={t("confirmDelete.description", {
					filename: deleteTarget ? `${deleteTarget.id}.${deleteTarget.extension}` : "",
				})}
				confirmLabel={t("actions.delete")}
				onConfirm={onConfirmDelete}
				pending={remove.isPending}
				destructive
			/>
		</div>
	);
}

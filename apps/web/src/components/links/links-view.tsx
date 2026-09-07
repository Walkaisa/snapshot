"use client";

import type { Link } from "@snapshot/contracts";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDeleteLink, useInfiniteLinks } from "@/hooks/use-links";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { LinkCreateDialog } from "./link-create-dialog";
import { LinkEditDialog } from "./link-edit-dialog";
import { DEFAULT_LINK_SORT, type LinkSort, LinkSortMenu } from "./link-sort-menu";
import { LinksEmpty } from "./links-empty";
import { LinksList } from "./links-list";

const SEARCH_DEBOUNCE_MS = 300;

export function LinksView({ baseUrl }: { baseUrl: string }) {
	const t = useTranslations("links");

	const [sort, setSort] = useState<LinkSort>(DEFAULT_LINK_SORT);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [search]);

	const params = useMemo(
		() => ({ sort: sort.field, order: sort.order, search: debouncedSearch }),
		[sort.field, sort.order, debouncedSearch],
	);

	const { data, isPending, isError, isPlaceholderData, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteLinks(params);
	const remove = useDeleteLink();

	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Link | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Link | null>(null);

	const items = useMemo(() => (data ? data.pages.flatMap((page) => page.items) : []), [data]);
	const total = data?.pages[0]?.total ?? 0;

	async function onConfirmDelete(): Promise<void> {
		if (deleteTarget === null) {
			return;
		}

		try {
			await remove.mutateAsync(deleteTarget.slug);
			setDeleteTarget(null);
			toast.success(t("actions.deleted"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("actions.deleteError"));
		}
	}

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-sm">{t("list.description", { count: total })}</p>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					<Plus />
					{t("create.action")}
				</Button>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<InputGroup className="sm:max-w-sm sm:flex-1">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={t("list.searchPlaceholder")}
						aria-label={t("list.search")}
					/>
				</InputGroup>
				<LinkSortMenu sort={sort} onSort={setSort} />
			</div>

			{isPending ? (
				<SettingsCardSkeleton rows={4} />
			) : items.length === 0 ? (
				<LinksEmpty searching={debouncedSearch.length > 0} onCreate={() => setCreateOpen(true)} />
			) : (
				<div className={cn("flex flex-col gap-4", isPlaceholderData && "opacity-60")}>
					<LinksList links={items} onEdit={setEditTarget} onDelete={setDeleteTarget} />
					{hasNextPage ? (
						<div className="flex justify-center">
							<Button type="button" variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
								{isFetchingNextPage ? t("loadingMore") : t("loadMore")}
							</Button>
						</div>
					) : null}
				</div>
			)}

			<LinkCreateDialog open={createOpen} onOpenChange={setCreateOpen} baseUrl={baseUrl} />
			<LinkEditDialog link={editTarget} onClose={() => setEditTarget(null)} />
			<ConfirmDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
				title={t("confirmDelete.title")}
				description={t("confirmDelete.description", { slug: deleteTarget?.slug ?? "" })}
				confirmLabel={t("actions.delete")}
				onConfirm={onConfirmDelete}
				pending={remove.isPending}
				destructive
			/>
		</div>
	);
}

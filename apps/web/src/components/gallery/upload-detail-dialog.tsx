"use client";

import { mediaKind, type Upload } from "@snapshot/contracts";
import { Copy, Download, EllipsisVertical, ExternalLink, FileQuestion, Link2, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useUploadStats } from "@/hooks/use-gallery";
import { CHECKERBOARD_STYLE } from "@/lib/media";

const MEDIA_CLASS = "max-h-[55vh] max-w-full rounded-md object-contain md:max-h-[65vh]";

function SectionTitle({ children }: { children: ReactNode }) {
	return <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{children}</h3>;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-2">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="min-w-0 text-sm">{children}</dd>
		</div>
	);
}

function ViewStats({ id }: { id: string }) {
	const t = useTranslations("gallery.views");
	const format = useFormatter();
	const { data, isPending, isError } = useUploadStats(id);

	if (isError) {
		return <p className="text-muted-foreground text-sm">{t("error")}</p>;
	}

	if (isPending) {
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{["a", "b", "c", "d"].map((key) => (
					<Skeleton key={key} className="h-16 rounded-lg" />
				))}
			</div>
		);
	}

	const entries = [
		{ key: "total", label: t("total"), value: data.views.total },
		{ key: "page", label: t("page"), value: data.views.page },
		{ key: "direct", label: t("direct"), value: data.views.raw },
		{ key: "download", label: t("download"), value: data.views.download },
	];

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{entries.map((entry) => (
				<div key={entry.key} className="rounded-lg border bg-muted/40 px-3 py-2.5">
					<p className="font-semibold text-lg tabular-nums leading-tight">{format.number(entry.value)}</p>
					<p className="text-muted-foreground text-xs">{entry.label}</p>
				</div>
			))}
		</div>
	);
}

function Preview({ upload }: { upload: Upload }) {
	const t = useTranslations("gallery");
	const kind = mediaKind(upload.mimeType);
	const filename = `${upload.id}.${upload.extension}`;

	return (
		<div
			className="flex min-h-56 items-center justify-center overflow-hidden rounded-lg p-4 ring-1 ring-foreground/10 sm:p-6"
			style={CHECKERBOARD_STYLE}
		>
			{kind === "image" ? (
				// biome-ignore lint/performance/noImgElement: originals are served byte-for-byte — next/image would re-encode and resize arbitrary user uploads
				<img
					src={upload.rawUrl}
					alt={filename}
					width={upload.width ?? undefined}
					height={upload.height ?? undefined}
					decoding="async"
					className={MEDIA_CLASS}
				/>
			) : kind === "video" ? (
				// biome-ignore lint/a11y/useMediaCaption: user-uploaded media ships no caption track
				<video controls playsInline preload="metadata" className={MEDIA_CLASS}>
					<source src={upload.rawUrl} type={upload.mimeType} />
				</video>
			) : (
				<div className="flex flex-col items-center gap-3 p-10 text-muted-foreground">
					<FileQuestion className="size-10" />
					<span className="text-sm">{t("noPreview")}</span>
				</div>
			)}
		</div>
	);
}

function DetailBody({ upload, onDelete }: { upload: Upload; onDelete: (upload: Upload) => void }) {
	const t = useTranslations("gallery");
	const format = useFormatter();
	const filename = `${upload.id}.${upload.extension}`;
	const createdAt = new Date(upload.createdAt);

	async function copy(value: string, message: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(message);
		} catch {
			toast.error(t("actions.copyError"));
		}
	}

	return (
		<DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-4xl">
			<div className="flex flex-col gap-6 p-6">
				<DialogHeader className="gap-1 pr-8 text-left">
					<DialogTitle className="break-all font-mono">{filename}</DialogTitle>
					<DialogDescription>{upload.mimeType}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
					<Preview upload={upload} />

					<div className="flex min-w-0 flex-col gap-6">
						<section className="flex flex-col gap-1">
							<SectionTitle>{t("details.file")}</SectionTitle>
							<dl className="divide-y">
								<DetailRow label={t("details.id")}>
									<span className="font-mono">{upload.id}</span>
								</DetailRow>
								<DetailRow label={t("details.type")}>{upload.mimeType}</DetailRow>
								{upload.width !== null && upload.height !== null ? (
									<DetailRow label={t("details.dimensions")}>
										{format.number(upload.width)} × {format.number(upload.height)}
									</DetailRow>
								) : null}
								<DetailRow label={t("details.size")}>
									{upload.sizeHuman} <span className="text-muted-foreground">({format.number(upload.sizeBytes)} B)</span>
								</DetailRow>
								<DetailRow label={t("details.uploaded")}>
									<time dateTime={upload.createdAt}>
										{format.dateTime(createdAt, {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "2-digit",
											timeZoneName: "short",
										})}
									</time>
								</DetailRow>
							</dl>
						</section>

						<section className="flex flex-col gap-2">
							<SectionTitle>{t("views.title")}</SectionTitle>
							<ViewStats id={upload.id} />
						</section>

						<section className="flex flex-col gap-1">
							<SectionTitle>{t("details.integrity")}</SectionTitle>
							<p className="break-all font-mono text-muted-foreground text-xs">{upload.checksumSha256}</p>
						</section>

						<div className="mt-auto flex items-center justify-end gap-2 border-t pt-4">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={<Button type="button" variant="outline" size="icon" aria-label={t("actions.more")} />}
								>
									<EllipsisVertical />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem render={<a href={upload.pageUrl} target="_blank" rel="noopener noreferrer" />}>
										<ExternalLink />
										{t("actions.open")}
									</DropdownMenuItem>
									<DropdownMenuItem render={<a href={`${upload.rawUrl}?download=1`} />}>
										<Download />
										{t("actions.download")}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => void copy(upload.pageUrl, t("actions.linkCopied"))}>
										<Link2 />
										{t("actions.copyLink")}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => void copy(upload.rawUrl, t("actions.directCopied"))}>
										<Copy />
										{t("actions.copyDirect")}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button type="button" variant="destructive" onClick={() => onDelete(upload)}>
								<Trash2 />
								{t("actions.delete")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</DialogContent>
	);
}

export function UploadDetailDialog({
	upload,
	onClose,
	onDelete,
}: {
	upload: Upload | null;
	onClose: () => void;
	onDelete: (upload: Upload) => void;
}) {
	return (
		<Dialog
			open={upload !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			{upload !== null ? <DetailBody upload={upload} onDelete={onDelete} /> : null}
		</Dialog>
	);
}

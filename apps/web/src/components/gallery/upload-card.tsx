"use client";

import { mediaKind, type Upload } from "@snapshot/contracts";
import { Link2, Play } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UploadActionsMenu } from "./upload-actions-menu";
import { UploadThumbnail } from "./upload-thumbnail";

const FALLBACK_ASPECT = 4 / 3;

function aspectRatio(upload: Upload): number {
	if (upload.width !== null && upload.height !== null) {
		return upload.width / upload.height;
	}
	return FALLBACK_ASPECT;
}

export function UploadCard({
	upload,
	onOpenDetails,
	onDelete,
}: {
	upload: Upload;
	onOpenDetails: (upload: Upload) => void;
	onDelete: (upload: Upload) => void;
}) {
	const t = useTranslations("gallery");
	const format = useFormatter();
	const filename = `${upload.id}.${upload.extension}`;
	const isVideo = mediaKind(upload.mimeType) === "video";
	const isGif = upload.extension.toLowerCase() === "gif";

	async function copyLink(): Promise<void> {
		try {
			await navigator.clipboard.writeText(upload.pageUrl);
			toast.success(t("actions.linkCopied"));
		} catch {
			toast.error(t("actions.copyError"));
		}
	}

	return (
		<div className="group/pin relative overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10 transition-shadow duration-200 hover:shadow-lg">
			<button
				type="button"
				onClick={() => onOpenDetails(upload)}
				aria-label={t("card.open", { filename })}
				style={{ aspectRatio: aspectRatio(upload) }}
				className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			>
				<UploadThumbnail upload={upload} iconClassName="size-9" />
			</button>

			{isVideo || isGif ? (
				<span className="pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 font-medium text-[11px] text-white backdrop-blur-sm">
					{isVideo ? <Play className="size-3 fill-current" /> : "GIF"}
				</span>
			) : null}

			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pt-12 pb-2.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover/pin:opacity-100 sm:group-focus-within/pin:opacity-100">
				<span className="truncate font-mono text-white text-xs">{filename}</span>
				<span className="truncate text-[11px] text-white/70">
					{upload.sizeHuman} · {format.relativeTime(new Date(upload.createdAt))}
				</span>
			</div>

			<div className="absolute top-2 right-2 flex items-center gap-1.5">
				<div className="hidden opacity-0 transition-opacity group-focus-within/pin:opacity-100 group-hover/pin:opacity-100 sm:block">
					<Button
						type="button"
						variant="secondary"
						size="icon-sm"
						aria-label={t("actions.copyLink")}
						onClick={() => void copyLink()}
					>
						<Link2 />
					</Button>
				</div>
				<div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover/pin:opacity-100 sm:group-focus-within/pin:opacity-100">
					<UploadActionsMenu upload={upload} onOpenDetails={onOpenDetails} onDelete={onDelete} triggerVariant="secondary" />
				</div>
			</div>
		</div>
	);
}

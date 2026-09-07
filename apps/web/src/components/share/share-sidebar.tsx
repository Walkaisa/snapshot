import type { PublicUpload } from "@snapshot/contracts";
import { Download, ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[7rem_1fr] items-baseline gap-3 py-2">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="min-w-0 text-sm">{children}</dd>
		</div>
	);
}

function DetailsSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-1">
			<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h2>
			<dl className="divide-y">{children}</dl>
		</section>
	);
}

export async function ShareSidebar({ upload }: { upload: PublicUpload }) {
	const t = await getTranslations("share");
	const format = await getFormatter();
	const filename = `${upload.id}.${upload.extension}`;
	const createdAt = new Date(upload.createdAt);

	return (
		<aside className="flex w-full shrink-0 flex-col border-t bg-card lg:h-svh lg:w-96 lg:overflow-y-auto lg:border-t-0 lg:border-l">
			<header className="border-b p-6">
				<Brand />
			</header>
			<div className="flex flex-col gap-6 p-6">
				<DetailsSection title={t("details.file")}>
					<DetailRow label={t("details.id")}>
						<span className="font-mono">{upload.id}</span>
					</DetailRow>
					<DetailRow label={t("details.filename")}>
						<span className="block truncate">{filename}</span>
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
				</DetailsSection>
				<DetailsSection title={t("details.integrity")}>
					<DetailRow label={t("details.checksum")}>
						<span className="block break-all font-mono text-xs">{upload.checksumSha256}</span>
					</DetailRow>
				</DetailsSection>
				<div className="flex flex-col gap-2 sm:flex-row">
					<a href={upload.downloadUrl} className={cn(buttonVariants(), "flex-1")}>
						<Download />
						{t("actions.download")}
					</a>
					<a
						href={upload.rawUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
					>
						<ExternalLink />
						{t("actions.original")}
					</a>
				</div>
			</div>
		</aside>
	);
}

import { mediaKind, type PublicUpload } from "@snapshot/contracts";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";

const REPOSITORY_URL = "https://github.com/Walkaisa/snapshot";

const CHECKERBOARD = {
	backgroundImage: [
		"linear-gradient(45deg, var(--muted) 25%, transparent 25%)",
		"linear-gradient(-45deg, var(--muted) 25%, transparent 25%)",
		"linear-gradient(45deg, transparent 75%, var(--muted) 75%)",
		"linear-gradient(-45deg, transparent 75%, var(--muted) 75%)",
	].join(", "),
	backgroundSize: "22px 22px",
	backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0",
};

const MEDIA_CLASS = "max-h-[60svh] max-w-full rounded-md object-contain shadow-lg lg:max-h-[calc(100svh-8rem)]";

async function ProjectReference() {
	const t = await getTranslations("share.footer");

	return (
		<p className="absolute inset-x-6 bottom-4 flex flex-col items-center gap-1 text-center text-muted-foreground text-xs">
			<span>{t("text")}</span>
			<a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:text-foreground">
				{t("link")}
			</a>
		</p>
	);
}

export async function SharePreview({ upload }: { upload: PublicUpload }) {
	const t = await getTranslations("share");
	const kind = mediaKind(upload.mimeType);
	const filename = `${upload.id}.${upload.extension}`;

	return (
		<main
			aria-label={filename}
			className="relative flex min-h-[55svh] flex-1 items-center justify-center overflow-hidden bg-background p-6 pb-16 lg:min-h-svh lg:p-11 lg:pb-20"
			style={CHECKERBOARD}
		>
			{kind === "image" ? (
				// biome-ignore lint/performance/noImgElement: the share page serves the original byte-for-byte — next/image would re-encode and resize arbitrary user uploads
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
				<video
					controls
					playsInline
					preload="metadata"
					width={upload.width ?? undefined}
					height={upload.height ?? undefined}
					className={MEDIA_CLASS}
				>
					<source src={upload.rawUrl} type={upload.mimeType} />
				</video>
			) : (
				<div className="flex flex-col items-center gap-3 text-muted-foreground">
					<FileQuestion className="size-10" />
					<span className="text-sm">{t("noPreview")}</span>
				</div>
			)}
			<ProjectReference />
		</main>
	);
}

import { mediaKind, type PublicUpload, THUMBNAIL_MIME_TYPE } from "@snapshot/contracts";
import type { Metadata } from "next";

function openGraphFor(upload: PublicUpload): Metadata["openGraph"] {
	const { embed } = upload;
	const base = {
		siteName: embed.providerName,
		title: embed.title,
		description: embed.description,
		url: upload.pageUrl,
		locale: embed.locale,
	};
	const size = upload.width !== null && upload.height !== null ? { width: upload.width, height: upload.height } : {};
	const media = { url: upload.rawUrl, secureUrl: upload.rawUrl, type: upload.mimeType, ...size };
	const poster =
		upload.thumbnailUrl === null
			? {}
			: { images: [{ url: upload.thumbnailUrl, secureUrl: upload.thumbnailUrl, type: THUMBNAIL_MIME_TYPE }] };

	switch (mediaKind(upload.mimeType)) {
		case "image":
			return { ...base, type: "website", images: [media] };
		case "video":
			return { ...base, type: "video.other", videos: [media], ...poster };
		default:
			return { ...base, type: "website" };
	}
}

function twitterFor(upload: PublicUpload): Metadata["twitter"] {
	const { embed } = upload;
	const base = { title: embed.title, description: embed.description };

	if (mediaKind(upload.mimeType) === "image") {
		return { ...base, card: "summary_large_image", images: [upload.rawUrl] };
	}

	return upload.thumbnailUrl === null
		? { ...base, card: "summary" }
		: { ...base, card: "summary_large_image", images: [upload.thumbnailUrl] };
}

export function shareMetadata(upload: PublicUpload): Metadata {
	if (!upload.embed.enabled) {
		return { title: `${upload.id}.${upload.extension}` };
	}

	return {
		title: upload.embed.title,
		description: upload.embed.description,
		openGraph: openGraphFor(upload),
		twitter: twitterFor(upload),
		other: { "og:theme-color": upload.embed.themeColor },
	};
}

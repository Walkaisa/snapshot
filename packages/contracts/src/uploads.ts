import { z } from "zod";

import { normalizeExtension } from "./utils.js";

export const UPLOAD_ID_MIN_LENGTH = 3;
export const UPLOAD_ID_MAX_LENGTH = 64;
export const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

export const uploadIdSchema = z.string().regex(UPLOAD_ID_PATTERN, {
	message: "Upload id must be 3-64 characters from A-Z, a-z, 0-9, hyphen or underscore",
});

export const viewTypeSchema = z.enum(["page", "raw", "download"]);
export type ViewType = z.infer<typeof viewTypeSchema>;

export const dimensionsSchema = z.object({
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
});
export type Dimensions = z.infer<typeof dimensionsSchema>;

export const uploadSchema = z.object({
	id: uploadIdSchema,
	extension: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number().int().nonnegative(),
	sizeHuman: z.string(),
	checksumSha256: z.string().length(64),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	thumbnailUrl: z.url().nullable(),
	url: z.url(),
	pageUrl: z.url(),
	rawUrl: z.url(),
	deleteUrl: z.url(),
});
export type Upload = z.infer<typeof uploadSchema>;

export const uploadListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(100).default(50),
});
export type UploadListQuery = z.infer<typeof uploadListQuerySchema>;

export const uploadListSchema = z.object({
	items: z.array(uploadSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().min(1),
	perPage: z.number().int().min(1),
});
export type UploadList = z.infer<typeof uploadListSchema>;

export const THUMBNAIL_MIME_TYPE = "image/webp";
export const THUMBNAIL_MAX_EDGE = 640;

export const UPLOAD_FILE_FIELD = "file";
export const UPLOAD_SLUG_FIELD = "slug";

export const MEDIA_MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
	".avi": ["video/x-msvideo"],
	".bmp": ["image/bmp"],
	".flv": ["video/x-flv"],
	".gif": ["image/gif"],
	".jpeg": ["image/jpeg"],
	".jpg": ["image/jpeg"],
	".mkv": ["video/x-matroska"],
	".mov": ["video/quicktime", "video/mp4"],
	".mp4": ["video/mp4"],
	".png": ["image/png"],
	".tiff": ["image/tiff"],
	".webm": ["video/webm"],
	".webp": ["image/webp"],
	".wmv": ["video/x-ms-wmv"],
};

export const MEDIA_EXTENSIONS: readonly string[] = Object.keys(MEDIA_MIME_TYPES_BY_EXTENSION);

export const MEDIA_MIME_TYPES: readonly string[] = [...new Set(Object.values(MEDIA_MIME_TYPES_BY_EXTENSION).flat())];

const mediaMimeTypes = new Set(MEDIA_MIME_TYPES);

export function mimeTypesForExtension(extension: string): readonly string[] {
	return MEDIA_MIME_TYPES_BY_EXTENSION[normalizeExtension(extension)] ?? [];
}

export function isMediaExtension(extension: string): boolean {
	return mimeTypesForExtension(extension).length > 0;
}

export function isMediaMimeType(mimeType: string): boolean {
	return mediaMimeTypes.has(mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "");
}

export const mediaKindSchema = z.enum(["image", "video", "unknown"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export function mediaKind(mimeType: string): MediaKind {
	const normalized = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";

	if (normalized.startsWith("image/")) {
		return "image";
	}

	if (normalized.startsWith("video/")) {
		return "video";
	}

	return "unknown";
}

export const THUMBNAIL_MIME_PREFIX = "video/";
export const THUMBNAIL_MIME_TYPES = ["image/gif"] as const;

export function supportsThumbnail(mimeType: string): boolean {
	const normalized = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";

	return normalized.startsWith(THUMBNAIL_MIME_PREFIX) || (THUMBNAIL_MIME_TYPES as readonly string[]).includes(normalized);
}

export function formatCreatedAt(iso: string, locale: string, timeZone: string): string {
	return new Date(iso).toLocaleString(locale.replaceAll("_", "-"), { timeZone });
}

export const publicEmbedSchema = z.object({
	enabled: z.boolean(),
	providerName: z.string(),
	themeColor: z.string(),
	title: z.string(),
	description: z.string(),
	locale: z.string(),
});
export type PublicEmbed = z.infer<typeof publicEmbedSchema>;

export const publicUploadSchema = z.object({
	id: uploadIdSchema,
	extension: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number().int().nonnegative(),
	sizeHuman: z.string(),
	checksumSha256: z.string().length(64),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	thumbnailUrl: z.url().nullable(),
	pageUrl: z.url(),
	rawUrl: z.url(),
	downloadUrl: z.url(),
	embed: publicEmbedSchema,
});
export type PublicUpload = z.infer<typeof publicUploadSchema>;

export const deleteDataSchema = z.object({
	id: uploadIdSchema,
	filename: z.string(),
});
export type DeleteData = z.infer<typeof deleteDataSchema>;

export const viewCountsSchema = z.object({
	page: z.number().int().nonnegative(),
	raw: z.number().int().nonnegative(),
	download: z.number().int().nonnegative(),
	total: z.number().int().nonnegative(),
});
export type ViewCounts = z.infer<typeof viewCountsSchema>;

export const uploadStatsSchema = z.object({
	uploadId: uploadIdSchema,
	views: viewCountsSchema,
});
export type UploadStats = z.infer<typeof uploadStatsSchema>;

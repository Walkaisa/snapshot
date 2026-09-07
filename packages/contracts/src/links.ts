import { z } from "zod";

import { sortOrderSchema } from "./common.js";

export const LINK_SLUG_MIN_LENGTH = 1;
export const LINK_SLUG_MAX_LENGTH = 64;
export const LINK_SLUG_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,62}[A-Za-z0-9])?$/;

export const LINK_ID_MIN_LENGTH = 3;
export const LINK_ID_MAX_LENGTH = 64;
export const LINK_TARGET_MAX_LENGTH = 2048;

export const linkSlugSchema = z
	.string()
	.trim()
	.max(LINK_SLUG_MAX_LENGTH, { message: `Slug must be at most ${LINK_SLUG_MAX_LENGTH} characters` })
	.regex(LINK_SLUG_PATTERN, {
		message: "Slug may contain letters, digits, hyphen and underscore, and must start and end with a letter or digit",
	});

export const linkTargetSchema = z
	.url({ protocol: /^https?$/, message: "Enter a full http:// or https:// URL" })
	.max(LINK_TARGET_MAX_LENGTH, { message: `URL must be at most ${LINK_TARGET_MAX_LENGTH} characters` });

export const linkCreateSchema = z
	.object({
		url: linkTargetSchema,
		slug: linkSlugSchema.optional(),
	})
	.strict();
export type LinkCreate = z.infer<typeof linkCreateSchema>;

export const linkUpdateSchema = z.object({ url: linkTargetSchema }).strict();
export type LinkUpdate = z.infer<typeof linkUpdateSchema>;

export const linkSchema = z.object({
	slug: linkSlugSchema,
	targetUrl: z.url(),
	visits: z.number().int().nonnegative(),
	createdAt: z.iso.datetime({ offset: true }),
	shortUrl: z.url(),
	deleteUrl: z.url(),
});
export type Link = z.infer<typeof linkSchema>;

export const LINK_SORT_FIELDS = ["slug", "targetUrl", "visits", "createdAt"] as const;
export const LINK_SEARCH_MAX_LENGTH = 200;

export const linkSortFieldSchema = z.enum(LINK_SORT_FIELDS);
export type LinkSortField = z.infer<typeof linkSortFieldSchema>;

export const linkListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(100).default(50),
	sort: linkSortFieldSchema.default("createdAt"),
	order: sortOrderSchema.default("desc"),
	search: z.string().trim().max(LINK_SEARCH_MAX_LENGTH).default(""),
});
export type LinkListQuery = z.infer<typeof linkListQuerySchema>;

export const linkListSchema = z.object({
	items: z.array(linkSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().min(1),
	perPage: z.number().int().min(1),
});
export type LinkList = z.infer<typeof linkListSchema>;

export const linkDeleteDataSchema = z.object({ slug: linkSlugSchema });
export type LinkDeleteData = z.infer<typeof linkDeleteDataSchema>;

export const publicLinkSchema = z.object({
	slug: linkSlugSchema,
	targetUrl: z.url(),
});
export type PublicLink = z.infer<typeof publicLinkSchema>;

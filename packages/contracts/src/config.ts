import { z } from "zod";

import { AUDIT_RETENTION_MAX_DAYS, AUDIT_RETENTION_MIN_DAYS } from "./audit.js";

import { effectiveIdMinimums, ID_MIN_OCCURRENCE_MAX, type IdShape, idAlphabetSchema, resolveIdAlphabet } from "./ids.js";
import { LINK_ID_MAX_LENGTH, LINK_ID_MIN_LENGTH } from "./links.js";
import { isMediaExtension, isMediaMimeType, UPLOAD_ID_MAX_LENGTH, UPLOAD_ID_MIN_LENGTH } from "./uploads.js";
import { normalizeExtension, parseCsv, templatePlaceholders } from "./utils.js";

export const API_KEY_MIN_LENGTH = 32;
export const THEME_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const EXTENSION_PATTERN = /^\.[a-z0-9]{1,10}$/;
export const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;

export const TEMPLATE_VARIABLES = ["id", "filename", "extension", "content_type", "size", "size_human", "created_at", "provider"] as const;

const templateVariableSet = new Set<string>(TEMPLATE_VARIABLES);

export const apiKeySchema = z
	.string()
	.trim()
	.min(API_KEY_MIN_LENGTH, {
		message: `API key must be at least ${API_KEY_MIN_LENGTH} characters long`,
	});

export const themeColorSchema = z.string().trim().regex(THEME_COLOR_PATTERN, {
	message: "Theme color must be a hex color like #5865F2",
});

export const embedTemplateSchema = z.string().superRefine((template, ctx) => {
	for (const name of templatePlaceholders(template)) {
		if (!templateVariableSet.has(name)) {
			ctx.addIssue({ code: "custom", message: `Unknown template variable: {${name}}` });
		}
	}
});

export const timezoneSchema = z
	.string()
	.trim()
	.superRefine((zone, ctx) => {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: zone });
		} catch {
			ctx.addIssue({ code: "custom", message: `Unknown timezone: ${zone}` });
		}
	});

export const localeSchema = z
	.string()
	.trim()
	.superRefine((locale, ctx) => {
		try {
			new Intl.Locale(locale.replaceAll("_", "-"));
		} catch {
			ctx.addIssue({ code: "custom", message: `Unknown locale: ${locale}` });
		}
	});

export const extensionsCsvSchema = z
	.string()
	.nullable()
	.superRefine((value, ctx) => {
		if (value === null) {
			return;
		}

		const entries = parseCsv(value).map((item) => normalizeExtension(item));
		const invalid = entries.filter((item) => !EXTENSION_PATTERN.test(item)).sort();

		if (invalid.length > 0) {
			ctx.addIssue({
				code: "custom",
				message: `Allowed extensions contain invalid entries: ${invalid.join(", ")}`,
			});
			return;
		}

		const unsupported = entries.filter((item) => !isMediaExtension(item)).sort();

		if (unsupported.length > 0) {
			ctx.addIssue({
				code: "custom",
				message: `Snapshot only stores media files, so these extensions cannot be allowed: ${unsupported.join(", ")}`,
			});
		}
	});

export const mimeTypesCsvSchema = z
	.string()
	.nullable()
	.superRefine((value, ctx) => {
		if (value === null) {
			return;
		}

		const entries = parseCsv(value).map((item) => item.toLowerCase());
		const invalid = entries.filter((item) => !MIME_TYPE_PATTERN.test(item)).sort();

		if (invalid.length > 0) {
			ctx.addIssue({
				code: "custom",
				message: `Allowed MIME types contain invalid entries: ${invalid.join(", ")}`,
			});
			return;
		}

		const unsupported = entries.filter((item) => !isMediaMimeType(item)).sort();

		if (unsupported.length > 0) {
			ctx.addIssue({
				code: "custom",
				message: `Snapshot only stores media files, so these MIME types cannot be allowed: ${unsupported.join(", ")}`,
			});
		}
	});

const idOccurrenceSchema = z.number().int().min(0).max(ID_MIN_OCCURRENCE_MAX);

const runtimeConfigShape = z.object({
	apiKey: apiKeySchema,
	maxFileSizeBytes: z.number().int().min(1),
	maxTotalStorageBytes: z.number().int().min(1).nullable(),
	uploadIdAlphabet: idAlphabetSchema,
	uploadIdMinDigits: idOccurrenceSchema,
	uploadIdMinSymbols: idOccurrenceSchema,
	uploadIdLength: z.number().int().min(UPLOAD_ID_MIN_LENGTH).max(UPLOAD_ID_MAX_LENGTH),
	linkIdAlphabet: idAlphabetSchema,
	linkIdMinDigits: idOccurrenceSchema,
	linkIdMinSymbols: idOccurrenceSchema,
	linkIdLength: z.number().int().min(LINK_ID_MIN_LENGTH).max(LINK_ID_MAX_LENGTH),
	allowedExtensions: extensionsCsvSchema,
	allowedMimeTypes: mimeTypesCsvSchema,
	auditRetentionDays: z.number().int().min(AUDIT_RETENTION_MIN_DAYS).max(AUDIT_RETENTION_MAX_DAYS),
	rateLimitEnabled: z.boolean(),
	rateLimitRequests: z.number().int().min(1),
	rateLimitWindowSeconds: z.number().int().min(1),
	embedEnabled: z.boolean(),
	embedProviderName: z.string().trim().min(1).max(64),
	embedTitleTemplate: embedTemplateSchema,
	embedDescriptionTemplate: embedTemplateSchema,
	embedThemeColor: themeColorSchema,
	embedLocale: localeSchema,
	timezone: timezoneSchema,
});

export const ID_KINDS = ["upload", "link"] as const;
export type IdKind = (typeof ID_KINDS)[number];

export const ID_CONFIG_FIELDS = {
	upload: {
		alphabet: "uploadIdAlphabet",
		minDigits: "uploadIdMinDigits",
		minSymbols: "uploadIdMinSymbols",
		length: "uploadIdLength",
	},
	link: {
		alphabet: "linkIdAlphabet",
		minDigits: "linkIdMinDigits",
		minSymbols: "linkIdMinSymbols",
		length: "linkIdLength",
	},
} as const;

export const ID_LENGTH_BOUNDS = {
	upload: { min: UPLOAD_ID_MIN_LENGTH, max: UPLOAD_ID_MAX_LENGTH },
	link: { min: LINK_ID_MIN_LENGTH, max: LINK_ID_MAX_LENGTH },
} as const;

export type IdConfig = Pick<z.infer<typeof runtimeConfigShape>, (typeof ID_CONFIG_FIELDS)[IdKind][keyof (typeof ID_CONFIG_FIELDS)[IdKind]]>;

export function idShapeFor(config: IdConfig, kind: IdKind): IdShape {
	const fields = ID_CONFIG_FIELDS[kind];

	return {
		alphabet: config[fields.alphabet],
		length: config[fields.length],
		minimums: { digits: config[fields.minDigits], symbols: config[fields.minSymbols] },
	};
}

export const runtimeConfigSchema = runtimeConfigShape.superRefine((config, ctx) => {
	for (const kind of ID_KINDS) {
		const shape = idShapeFor(config, kind);
		const required = effectiveIdMinimums(resolveIdAlphabet(shape.alphabet), shape.minimums);
		const total = required.digits + required.symbols;

		if (total > shape.length) {
			ctx.addIssue({
				code: "custom",
				path: [ID_CONFIG_FIELDS[kind].length],
				message: `Length must be at least ${total} to fit the required digits and symbols`,
			});
		}
	}
});
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export const configUpdateSchema = runtimeConfigShape.omit({ apiKey: true }).partial().strict();
export type ConfigUpdate = z.infer<typeof configUpdateSchema>;

export const configViewSchema = runtimeConfigShape.extend({ apiKey: z.string() });
export type ConfigView = z.infer<typeof configViewSchema>;

export const apiKeyDataSchema = z.object({
	apiKey: z.string(),
});
export type ApiKeyData = z.infer<typeof apiKeyDataSchema>;

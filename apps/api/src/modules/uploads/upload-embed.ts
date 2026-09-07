import { fillTemplate, formatCreatedAt, humanReadableSize, type PublicEmbed, type RuntimeConfig } from "@snapshot/contracts";

import type { CachedUpload } from "../../redis/cache.service.js";
import { uploadFilename } from "./upload-filename.js";

export function buildPublicEmbed(meta: CachedUpload, config: RuntimeConfig): PublicEmbed {
	const values: Record<string, string> = {
		id: meta.id,
		filename: uploadFilename(meta.id, meta.extension),
		extension: meta.extension,
		content_type: meta.mimeType,
		size: String(meta.sizeBytes),
		size_human: humanReadableSize(meta.sizeBytes),
		created_at: formatCreatedAt(meta.createdAt, config.embedLocale, config.timezone),
		provider: config.embedProviderName,
	};

	return {
		enabled: config.embedEnabled,
		providerName: config.embedProviderName,
		themeColor: config.embedThemeColor,
		title: fillTemplate(config.embedTitleTemplate, values),
		description: fillTemplate(config.embedDescriptionTemplate, values),
		locale: config.embedLocale,
	};
}

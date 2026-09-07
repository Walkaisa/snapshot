import {
	type ConfigView,
	isMediaExtension,
	MEDIA_EXTENSIONS,
	MEDIA_MIME_TYPES,
	mimeTypesForExtension,
	normalizeExtension,
	parseCsv,
} from "@snapshot/contracts";

const GENERIC_MIME_TYPES = new Set(["application/octet-stream", "binary/octet-stream"]);

export type UploadBreach = "type" | "size" | "empty";

export interface UploadRules {
	extensions: string[];
	mimeTypes: string[];
	maxFileSizeBytes: number;
	accept: string;
}

export type UploadLimits = Pick<ConfigView, "allowedExtensions" | "allowedMimeTypes" | "maxFileSizeBytes">;

export function fileExtension(filename: string): string {
	const dot = filename.lastIndexOf(".");

	return dot > 0 ? normalizeExtension(filename.slice(dot)) : "";
}

export function uploadRules(limits: UploadLimits): UploadRules {
	const configured =
		limits.allowedExtensions === null
			? [...MEDIA_EXTENSIONS]
			: parseCsv(limits.allowedExtensions).map((item) => normalizeExtension(item));
	const extensions = [...new Set(configured.filter((item) => isMediaExtension(item)))].sort();
	const mimeTypes =
		limits.allowedMimeTypes === null ? [...MEDIA_MIME_TYPES] : parseCsv(limits.allowedMimeTypes).map((item) => item.toLowerCase());

	return {
		extensions,
		mimeTypes,
		maxFileSizeBytes: limits.maxFileSizeBytes,
		accept: [...extensions, ...mimeTypes].join(","),
	};
}

export function breachFor(file: File, rules: UploadRules): UploadBreach | null {
	const extension = fileExtension(file.name);

	if (!rules.extensions.includes(extension)) {
		return "type";
	}

	const declared = file.type.split(";", 1)[0]?.trim().toLowerCase() ?? "";

	if (declared.length > 0 && !GENERIC_MIME_TYPES.has(declared)) {
		if (!mimeTypesForExtension(extension).includes(declared) || !rules.mimeTypes.includes(declared)) {
			return "type";
		}
	}

	if (file.size === 0) {
		return "empty";
	}

	if (file.size > rules.maxFileSizeBytes) {
		return "size";
	}

	return null;
}

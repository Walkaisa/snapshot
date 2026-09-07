import path from "node:path";
import { UPLOAD_ID_PATTERN } from "@snapshot/contracts";

export interface ParsedUploadFilename {
	id: string;
	extension: string;
}

export function uploadFilename(id: string, extension: string): string {
	return `${id}.${extension}`;
}

export function parseUploadFilename(filename: string): ParsedUploadFilename | null {
	const suffix = path.extname(filename);
	const id = path.basename(filename, suffix);
	const extension = suffix.slice(1).toLowerCase();

	if (!UPLOAD_ID_PATTERN.test(id) || extension.length === 0) {
		return null;
	}

	return { id, extension };
}

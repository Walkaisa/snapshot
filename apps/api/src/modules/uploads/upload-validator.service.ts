import { HttpStatus, Injectable } from "@nestjs/common";
import {
	MEDIA_EXTENSIONS,
	MEDIA_MIME_TYPES,
	mimeTypesForExtension,
	normalizeExtension,
	parseCsv,
	type RuntimeConfig,
} from "@snapshot/contracts";

import { AppException } from "../../common/exceptions/app.exception.js";

const GENERIC_UPLOAD_MIME_TYPES = new Set(["application/octet-stream", "binary/octet-stream"]);

@Injectable()
export class UploadValidatorService {
	allowedExtensions(config: RuntimeConfig): Set<string> {
		if (config.allowedExtensions === null) {
			return new Set(MEDIA_EXTENSIONS);
		}

		return new Set(parseCsv(config.allowedExtensions).map((item) => normalizeExtension(item)));
	}

	allowedMimeTypes(config: RuntimeConfig): Set<string> {
		if (config.allowedMimeTypes === null) {
			return new Set(MEDIA_MIME_TYPES);
		}

		return new Set(parseCsv(config.allowedMimeTypes).map((item) => item.toLowerCase()));
	}

	validateExtension(extension: string, config: RuntimeConfig): void {
		if (!this.allowedExtensions(config).has(extension)) {
			throw new AppException(HttpStatus.BAD_REQUEST, `File type is not permitted: ${extension || "none"}`, "invalid_file_type");
		}
	}

	validateDeclaredContentType(extension: string, declared: string | undefined, config: RuntimeConfig): void {
		if (!declared) {
			return;
		}

		const normalized = declared.split(";", 1)[0]?.trim().toLowerCase() ?? "";

		if (GENERIC_UPLOAD_MIME_TYPES.has(normalized)) {
			return;
		}

		const expected = mimeTypesForExtension(extension);

		if (!expected.includes(normalized) || !this.allowedMimeTypes(config).has(normalized)) {
			throw new AppException(HttpStatus.BAD_REQUEST, `Content type is not permitted: ${normalized}`, "invalid_content_type");
		}
	}

	validateDetectedContentType(extension: string, detected: string | null, config: RuntimeConfig): asserts detected is string {
		const expected = mimeTypesForExtension(extension);

		if (detected === null || !expected.includes(detected) || !this.allowedMimeTypes(config).has(detected)) {
			throw new AppException(
				HttpStatus.BAD_REQUEST,
				`Content type is not permitted: ${detected ?? "unknown"}`,
				"invalid_content_type",
			);
		}
	}
}

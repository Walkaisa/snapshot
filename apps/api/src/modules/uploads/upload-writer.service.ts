import { createHash } from "node:crypto";
import path from "node:path";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ID_MAX_LENGTH, normalizeExtension, type RuntimeConfig, UPLOAD_FILE_FIELD, UPLOAD_SLUG_FIELD } from "@snapshot/contracts";
import busboy from "busboy";
import type { Request } from "express";

import { AppException } from "../../common/exceptions/app.exception.js";
import { SIGNATURE_SAMPLE_BYTES } from "./file-signatures.js";
import { StorageService } from "./storage.service.js";

export interface WrittenFile {
	tempPath: string;
	extension: string;
	declaredContentType: string | undefined;
	sizeBytes: number;
	checksumSha256: string;
	sample: Buffer;
}

export interface WrittenUpload extends WrittenFile {
	slug: string | null;
}

const MAX_FIELDS = 8;

@Injectable()
export class UploadWriterService {
	constructor(private readonly storage: StorageService) {}

	write(request: Request, config: RuntimeConfig): Promise<WrittenUpload> {
		return new Promise<WrittenUpload>((resolve, reject) => {
			const bb = busboy({
				headers: request.headers,
				limits: { files: 1, fields: MAX_FIELDS, fieldSize: ID_MAX_LENGTH, fileSize: config.maxFileSizeBytes },
			});

			let tempPath: string | null = null;
			let fileSeen = false;
			let settled = false;
			let closed = false;
			let written: WrittenFile | null = null;
			let slug: string | null = null;

			const fail = (error: AppException): void => {
				if (settled) {
					return;
				}
				settled = true;
				request.unpipe(bb);
				if (tempPath !== null) {
					void this.storage.discard(tempPath);
				}
				reject(error);
			};

			const settle = (): void => {
				if (settled || !closed) {
					return;
				}

				if (!fileSeen) {
					fail(new AppException(HttpStatus.BAD_REQUEST, "No file field in the upload", "missing_filename"));
					return;
				}

				if (written === null) {
					return;
				}

				settled = true;
				resolve({ ...written, slug });
			};

			bb.on("field", (field, value, info) => {
				if (field !== UPLOAD_SLUG_FIELD) {
					return;
				}

				if (info.valueTruncated) {
					fail(new AppException(HttpStatus.BAD_REQUEST, "The requested slug is too long", "validation_error"));
					return;
				}

				const trimmed = value.trim();
				slug = trimmed.length > 0 ? trimmed : null;
			});

			bb.on("file", (field, stream, info) => {
				if (field !== UPLOAD_FILE_FIELD || fileSeen) {
					stream.resume();
					return;
				}
				fileSeen = true;

				if (!info.filename) {
					stream.resume();
					fail(new AppException(HttpStatus.BAD_REQUEST, "Uploaded file has no filename", "missing_filename"));
					return;
				}

				const extension = normalizeExtension(path.extname(info.filename));
				const target = this.storage.createTempPath();
				tempPath = target;
				const output = this.storage.openWriteStream(target);
				const hash = createHash("sha256");
				const sampleParts: Buffer[] = [];
				let sampleLength = 0;
				let sizeBytes = 0;

				stream.on("data", (chunk: Buffer) => {
					sizeBytes += chunk.length;
					hash.update(chunk);

					if (sampleLength < SIGNATURE_SAMPLE_BYTES) {
						const slice = chunk.subarray(0, SIGNATURE_SAMPLE_BYTES - sampleLength);
						sampleParts.push(slice);
						sampleLength += slice.length;
					}
				});

				stream.on("limit", () => {
					output.destroy();
					fail(new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded file is too large", "file_too_large"));
				});

				output.on("error", () =>
					fail(new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store upload", "internal_server_error")),
				);

				output.on("finish", () => {
					if (settled) {
						return;
					}

					if (sizeBytes === 0) {
						fail(new AppException(HttpStatus.BAD_REQUEST, "Uploaded file is empty", "file_empty"));
						return;
					}

					written = {
						tempPath: target,
						extension,
						declaredContentType: info.mimeType,
						sizeBytes,
						checksumSha256: hash.digest("hex"),
						sample: Buffer.concat(sampleParts),
					};
					settle();
				});

				stream.pipe(output);
			});

			bb.on("error", () => fail(new AppException(HttpStatus.BAD_REQUEST, "Malformed multipart upload", "validation_error")));

			bb.on("close", () => {
				closed = true;
				settle();
			});

			request.pipe(bb);
		});
	}
}

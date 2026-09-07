import { createReadStream } from "node:fs";
import { pipeline, type Readable } from "node:stream";
import { Controller, Get, HttpStatus, Logger, Param, Query, Req, Res } from "@nestjs/common";
import { THUMBNAIL_MIME_TYPE } from "@snapshot/contracts";
import type { Request, Response } from "express";

import { Public } from "../../common/decorators/auth.decorator.js";
import { SkipEnvelope } from "../../common/decorators/response.decorator.js";
import { AppException } from "../../common/exceptions/app.exception.js";
import { parseByteRange } from "./http-range.js";
import { UploadService } from "./upload.service.js";
import { ViewTrackerService } from "./view-tracker.service.js";

const RAW_CACHE_CONTROL = "public, max-age=31536000, immutable";

@Controller("raw")
export class RawController {
	private readonly logger = new Logger(RawController.name);

	constructor(
		private readonly uploads: UploadService,
		private readonly viewTracker: ViewTrackerService,
	) {}

	@Get("thumbnail/:id")
	@Public()
	@SkipEnvelope()
	async thumbnail(@Param("id") id: string, @Req() request: Request, @Res() response: Response): Promise<void> {
		const target = await this.uploads.locateThumbnail(id);

		if (target === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "Thumbnail not found", "file_not_found");
		}

		const etag = `"${target.meta.checksumSha256}-thumbnail"`;

		response.set({
			"Content-Type": THUMBNAIL_MIME_TYPE,
			"Cache-Control": RAW_CACHE_CONTROL,
			ETag: etag,
		});

		if (request.headers["if-none-match"] === etag) {
			response.status(HttpStatus.NOT_MODIFIED).end();
			return;
		}

		this.stream(createReadStream(target.path), response, target.meta.id);
	}

	@Get(":filename")
	@Public()
	@SkipEnvelope()
	async serve(
		@Param("filename") filename: string,
		@Query("download") download: string | undefined,
		@Req() request: Request,
		@Res() response: Response,
	): Promise<void> {
		const target = await this.uploads.locateRaw(filename);

		if (target === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "File not found", "file_not_found");
		}

		const isDownload = download === "1" || download === "true";
		const etag = `"${target.meta.checksumSha256}"`;
		const sizeBytes = target.meta.sizeBytes;
		const range = parseByteRange(request.headers.range, sizeBytes);

		const isOpeningRequest = range === null || (range !== "unsatisfiable" && range.start === 0);

		if (isOpeningRequest) {
			this.viewTracker.track(target.meta.id, isDownload ? "download" : "raw", request);
		}

		response.set({
			"Content-Type": target.meta.mimeType,
			"Cache-Control": RAW_CACHE_CONTROL,
			ETag: etag,
			"Accept-Ranges": "bytes",
		});

		if (isDownload) {
			response.set("Content-Disposition", `attachment; filename="${filename}"`);
		}

		if (request.headers["if-none-match"] === etag) {
			response.status(HttpStatus.NOT_MODIFIED).end();
			return;
		}

		if (range === "unsatisfiable") {
			response.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).set("Content-Range", `bytes */${sizeBytes}`).end();
			return;
		}

		if (range === null) {
			response.set("Content-Length", String(sizeBytes));
			this.stream(createReadStream(target.path), response, target.meta.id);
			return;
		}

		response.status(HttpStatus.PARTIAL_CONTENT).set({
			"Content-Range": `bytes ${range.start}-${range.end}/${sizeBytes}`,
			"Content-Length": String(range.end - range.start + 1),
		});
		this.stream(createReadStream(target.path, { start: range.start, end: range.end }), response, target.meta.id);
	}

	private stream(source: Readable, response: Response, id: string): void {
		pipeline(source, response, (error) => {
			if (error && (error as NodeJS.ErrnoException).code !== "ERR_STREAM_PREMATURE_CLOSE") {
				this.logger.warn({ err: error, uploadId: id }, "Raw stream failed");
			}
		});
	}
}

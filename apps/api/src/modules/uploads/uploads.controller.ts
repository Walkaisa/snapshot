import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { DeleteData, PublicUpload, Upload, UploadList, UploadStats } from "@snapshot/contracts";
import type { Request } from "express";

import { AuditAction, routeParam } from "../../common/decorators/audit.decorator.js";
import { Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { WriteRateLimitGuard } from "../../common/guards/write-rate-limit.guard.js";
import { SessionOrApiKeyGuard } from "../auth/guards/session-or-api-key.guard.js";

import { UploadListQueryDto } from "./upload.dto.js";
import { UploadService } from "./upload.service.js";

function uploadDimensions(upload: Upload): string | null {
	return upload.width === null || upload.height === null ? null : `${upload.width}×${upload.height}`;
}

@Controller("uploads")
export class UploadsController {
	constructor(private readonly uploads: UploadService) {}

	@Post()
	@Public()
	@UseGuards(SessionOrApiKeyGuard, WriteRateLimitGuard)
	@HttpCode(HttpStatus.CREATED)
	@AuditAction("uploads.create", {
		id: (result) => (result as Upload).id,
		metadata: (result) => ({
			filename: `${(result as Upload).id}.${(result as Upload).extension}`,
			mimeType: (result as Upload).mimeType,
			size: (result as Upload).sizeHuman,
			sizeBytes: (result as Upload).sizeBytes,
			dimensions: uploadDimensions(result as Upload),
			pageUrl: (result as Upload).pageUrl,
		}),
	})
	@ResponseMessage("File uploaded")
	upload(@Req() request: Request): Promise<Upload> {
		return this.uploads.upload(request);
	}

	@Get()
	@Public()
	@UseGuards(SessionOrApiKeyGuard)
	@ResponseMessage("Uploads returned")
	list(@Query() query: UploadListQueryDto): Promise<UploadList> {
		return this.uploads.list(query);
	}

	@Get(":id/stats")
	@ResponseMessage("Upload statistics")
	stats(@Param("id") id: string): Promise<UploadStats> {
		return this.uploads.stats(id);
	}

	@Get(":id")
	@Public()
	@ResponseMessage("Upload metadata")
	getPublic(@Param("id") id: string, @Req() request: Request): Promise<PublicUpload> {
		return this.uploads.getPublic(id, request);
	}

	@Delete(":id")
	@Public()
	@UseGuards(SessionOrApiKeyGuard)
	@HttpCode(HttpStatus.OK)
	@AuditAction("uploads.delete", {
		id: (_result, request) => routeParam(request, "id"),
		metadata: (result) => ({ filename: (result as DeleteData).filename }),
	})
	@ResponseMessage("File deleted")
	delete(@Param("id") id: string): Promise<DeleteData> {
		return this.uploads.delete(id);
	}
}

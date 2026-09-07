import { HttpStatus, Injectable } from "@nestjs/common";
import { idSchema, type ResolvedId } from "@snapshot/contracts";
import type { Request } from "express";

import { AppException } from "../../common/exceptions/app.exception.js";
import { LinkService } from "../links/link.service.js";
import { UploadService } from "../uploads/upload.service.js";

@Injectable()
export class ResolveService {
	constructor(
		private readonly uploads: UploadService,
		private readonly links: LinkService,
	) {}

	async resolve(id: string, request: Request): Promise<ResolvedId> {
		if (idSchema.safeParse(id).success) {
			const upload = await this.uploads.findPublic(id, request);

			if (upload !== null) {
				return { kind: "upload", upload };
			}

			const link = await this.links.resolve(id, request);

			if (link !== null) {
				return { kind: "link", link };
			}
		}

		throw new AppException(HttpStatus.NOT_FOUND, "Nothing is shared under this id", "not_found");
	}
}

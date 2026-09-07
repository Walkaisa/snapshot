import { HttpStatus, Injectable } from "@nestjs/common";
import { generateUnreservedId, type IdOccupant, type IdShape, isReservedId } from "@snapshot/contracts";

import { AppException } from "../../common/exceptions/app.exception.js";
import { LinkRepository } from "../../db/repositories/link.repository.js";
import { UploadRepository } from "../../db/repositories/upload.repository.js";

const MAX_RETRIES = 10;

@Injectable()
export class IdAllocatorService {
	constructor(
		private readonly uploads: UploadRepository,
		private readonly links: LinkRepository,
	) {}

	async occupantOf(id: string): Promise<IdOccupant | null> {
		if (isReservedId(id)) {
			return "reserved";
		}

		if ((await this.uploads.findById(id)) !== null) {
			return "upload";
		}

		if ((await this.links.findBySlug(id)) !== null) {
			return "link";
		}

		return null;
	}

	async isAvailable(id: string): Promise<boolean> {
		return (await this.occupantOf(id)) === null;
	}

	async assertAvailable(id: string): Promise<void> {
		if (!(await this.isAvailable(id))) {
			throw new AppException(HttpStatus.CONFLICT, `The id "${id}" is already in use`, "slug_unavailable");
		}
	}

	async allocate(shape: IdShape, alsoTaken?: (id: string) => Promise<boolean>): Promise<string> {
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
			const id = generateUnreservedId(shape);

			if ((await this.isAvailable(id)) && !(await alsoTaken?.(id))) {
				return id;
			}
		}

		throw new AppException(
			HttpStatus.INTERNAL_SERVER_ERROR,
			`Could not allocate a free id in ${MAX_RETRIES + 1} draws — raise the id length`,
			"internal_server_error",
		);
	}
}

import { Injectable, Logger } from "@nestjs/common";
import type { ViewType } from "@snapshot/contracts";
import type { Request } from "express";

import { hashIp } from "../../common/utils/ip-hash.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { UploadViewRepository } from "../../db/repositories/upload-view.repository.js";
import { CacheService } from "../../redis/cache.service.js";

const HEADER_MAX_LENGTH = 255;

function truncate(value: string | undefined): string | null {
	return value ? value.slice(0, HEADER_MAX_LENGTH) : null;
}

@Injectable()
export class ViewTrackerService {
	private readonly logger = new Logger(ViewTrackerService.name);

	constructor(
		private readonly cache: CacheService,
		private readonly views: UploadViewRepository,
		private readonly config: AppConfigService,
	) {}

	track(uploadId: string, type: ViewType, request: Request): void {
		void this.record(uploadId, type, request);
	}

	private async record(uploadId: string, type: ViewType, request: Request): Promise<void> {
		try {
			await this.views.insert({
				uploadId,
				viewType: type,
				ipHash: hashIp(request.ip, this.config.env.SESSION_SECRET),
				userAgent: truncate(request.get("user-agent")),
				referer: truncate(request.get("referer")),
			});
			await this.cache.incrementView(uploadId, type);
		} catch (error) {
			this.logger.warn({ err: error }, "View tracking failed");
		}
	}
}

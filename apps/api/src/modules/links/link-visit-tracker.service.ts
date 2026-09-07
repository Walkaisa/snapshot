import { Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";

import { hashIp } from "../../common/utils/ip-hash.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { LinkVisitRepository } from "../../db/repositories/link-visit.repository.js";

const HEADER_MAX_LENGTH = 255;

function truncate(value: string | undefined): string | null {
	return value ? value.slice(0, HEADER_MAX_LENGTH) : null;
}

@Injectable()
export class LinkVisitTrackerService {
	private readonly logger = new Logger(LinkVisitTrackerService.name);

	constructor(
		private readonly visits: LinkVisitRepository,
		private readonly config: AppConfigService,
	) {}

	track(slug: string, request: Request): void {
		void this.record(slug, request);
	}

	private async record(slug: string, request: Request): Promise<void> {
		try {
			await this.visits.insert({
				linkSlug: slug,
				ipHash: hashIp(request.ip, this.config.env.SESSION_SECRET),
				userAgent: truncate(request.get("user-agent")),
				referer: truncate(request.get("referer")),
			});
		} catch (error) {
			this.logger.warn({ err: error }, "Link visit tracking failed");
		}
	}
}

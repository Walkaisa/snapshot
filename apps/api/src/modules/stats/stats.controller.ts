import { Controller, Get, Query } from "@nestjs/common";
import type { OverviewStats, StorageBreakdown, UploadActivity } from "@snapshot/contracts";

import { CurrentAdmin } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import type { AuthAdmin } from "../auth/auth.types.js";
import { StatsRangeQueryDto } from "./stats.dto.js";
import { StatsService } from "./stats.service.js";

@Controller("stats")
export class StatsController {
	constructor(private readonly stats: StatsService) {}

	@Get("overview")
	@ResponseMessage("Overview statistics")
	overview(@CurrentAdmin() admin: AuthAdmin): Promise<OverviewStats> {
		return this.stats.overview(admin.id);
	}

	@Get("activity")
	@ResponseMessage("Upload activity")
	activity(@Query() query: StatsRangeQueryDto): Promise<UploadActivity> {
		return this.stats.activity(query.days);
	}

	@Get("breakdown")
	@ResponseMessage("Storage breakdown")
	breakdown(): Promise<StorageBreakdown> {
		return this.stats.breakdown();
	}
}

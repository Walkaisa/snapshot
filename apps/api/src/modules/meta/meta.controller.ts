import { Controller, Get } from "@nestjs/common";
import type { ProjectMeta } from "@snapshot/contracts";

import { APP_AUTHOR, APP_NAME, APP_REPOSITORY } from "../../common/constants.js";
import { Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { VersionService } from "./version.service.js";

@Controller("meta")
export class MetaController {
	constructor(private readonly versionService: VersionService) {}

	@Get()
	@Public()
	@ResponseMessage("Snapshot is running")
	getMeta(): ProjectMeta {
		return {
			name: APP_NAME,
			author: APP_AUTHOR,
			repository: APP_REPOSITORY,
			version: this.versionService.getVersionInfo(),
		};
	}
}

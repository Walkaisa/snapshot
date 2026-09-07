import { Module } from "@nestjs/common";

import { GithubReleaseChecker } from "./github-release-checker.js";
import { MetaController } from "./meta.controller.js";
import { RELEASE_CHECKER } from "./release-checker.js";
import { VersionService } from "./version.service.js";

@Module({
	controllers: [MetaController],
	providers: [VersionService, { provide: RELEASE_CHECKER, useClass: GithubReleaseChecker }],
	exports: [VersionService],
})
export class MetaModule {}

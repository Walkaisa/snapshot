import { Module } from "@nestjs/common";

import { LinksModule } from "../links/links.module.js";
import { UploadsModule } from "../uploads/uploads.module.js";
import { ResolveController } from "./resolve.controller.js";
import { ResolveService } from "./resolve.service.js";

@Module({
	imports: [UploadsModule, LinksModule],
	controllers: [ResolveController],
	providers: [ResolveService],
})
export class ResolveModule {}

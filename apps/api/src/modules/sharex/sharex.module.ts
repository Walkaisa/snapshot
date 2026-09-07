import { Module } from "@nestjs/common";

import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { ShareXController } from "./sharex.controller.js";
import { ShareXService } from "./sharex.service.js";

@Module({
	imports: [RuntimeConfigModule],
	controllers: [ShareXController],
	providers: [ShareXService],
})
export class ShareXModule {}

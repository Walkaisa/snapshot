import { Module } from "@nestjs/common";

import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { ConfigController } from "./config.controller.js";

@Module({
	imports: [RuntimeConfigModule],
	controllers: [ConfigController],
})
export class ConfigModule {}

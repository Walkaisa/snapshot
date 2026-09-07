import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../db/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { RuntimeConfigModule } from "../runtime-config/runtime-config.module.js";
import { IdAllocatorService } from "./id-allocator.service.js";
import { IdsController } from "./ids.controller.js";

@Module({
	imports: [DatabaseModule, AuthModule, RuntimeConfigModule],
	controllers: [IdsController],
	providers: [IdAllocatorService],
	exports: [IdAllocatorService],
})
export class IdsModule {}

import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../db/database.module.js";
import { RedisModule } from "../../redis/redis.module.js";
import { RuntimeConfigService } from "./runtime-config.service.js";

@Module({
	imports: [DatabaseModule, RedisModule],
	providers: [RuntimeConfigService],
	exports: [RuntimeConfigService],
})
export class RuntimeConfigModule {}

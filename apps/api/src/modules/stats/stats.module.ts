import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../db/database.module.js";
import { RedisModule } from "../../redis/redis.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { MetaModule } from "../meta/meta.module.js";
import { StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";

@Module({
	imports: [DatabaseModule, RedisModule, AuthModule, MetaModule],
	controllers: [StatsController],
	providers: [StatsService],
})
export class StatsModule {}

import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { createLoggerOptions } from "./common/logger/logger.config.js";
import { AppConfigModule } from "./config/app-config.module.js";
import { AppConfigService } from "./config/app-config.service.js";
import { DatabaseModule } from "./db/database.module.js";
import { AccountModule } from "./modules/account/account.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { ConfigModule } from "./modules/config/config.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { IdsModule } from "./modules/ids/ids.module.js";
import { LinksModule } from "./modules/links/links.module.js";
import { MetaModule } from "./modules/meta/meta.module.js";
import { ResolveModule } from "./modules/resolve/resolve.module.js";
import { RuntimeConfigModule } from "./modules/runtime-config/runtime-config.module.js";
import { ShareXModule } from "./modules/sharex/sharex.module.js";
import { StatsModule } from "./modules/stats/stats.module.js";
import { UploadsModule } from "./modules/uploads/uploads.module.js";
import { RedisModule } from "./redis/redis.module.js";

@Module({
	imports: [
		AppConfigModule,
		LoggerModule.forRootAsync({
			imports: [AppConfigModule],
			inject: [AppConfigService],
			useFactory: createLoggerOptions,
		}),
		DatabaseModule,
		RedisModule,
		AuditModule,
		AuthModule,
		RuntimeConfigModule,
		ConfigModule,
		AccountModule,
		IdsModule,
		UploadsModule,
		LinksModule,
		ResolveModule,
		StatsModule,
		ShareXModule,
		HealthModule,
		MetaModule,
	],
	providers: [
		{ provide: APP_PIPE, useClass: ZodValidationPipe },
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
	],
})
export class AppModule {}

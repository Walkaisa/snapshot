import { Inject, Module, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { AppConfigService } from "../config/app-config.service.js";
import { DRIZZLE, PG_CLIENT } from "./database.constants.js";
import { runMigrations } from "./migrator.js";
import { AdminRepository } from "./repositories/admin.repository.js";
import { AuditRepository } from "./repositories/audit.repository.js";
import { ConfigRepository } from "./repositories/config.repository.js";
import { LinkRepository } from "./repositories/link.repository.js";
import { LinkVisitRepository } from "./repositories/link-visit.repository.js";
import { RecoveryCodeRepository } from "./repositories/recovery-code.repository.js";
import { UploadRepository } from "./repositories/upload.repository.js";
import { UploadViewRepository } from "./repositories/upload-view.repository.js";
import * as schema from "./schema/index.js";

const repositories = [
	AdminRepository,
	AuditRepository,
	ConfigRepository,
	LinkRepository,
	LinkVisitRepository,
	RecoveryCodeRepository,
	UploadRepository,
	UploadViewRepository,
];

@Module({
	providers: [
		{
			provide: PG_CLIENT,
			inject: [AppConfigService],
			useFactory: (config: AppConfigService) => postgres(config.env.DATABASE_URL, { onnotice: () => {} }),
		},
		{
			provide: DRIZZLE,
			inject: [PG_CLIENT],
			useFactory: (client: postgres.Sql) => drizzle(client, { schema, casing: "snake_case" }),
		},
		...repositories,
	],
	exports: [DRIZZLE, ...repositories],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
	constructor(
		private readonly config: AppConfigService,
		@Inject(PG_CLIENT) private readonly client: postgres.Sql,
	) {}

	async onModuleInit(): Promise<void> {
		await runMigrations(this.config.env.DATABASE_URL);
	}

	async onApplicationShutdown(): Promise<void> {
		await this.client.end();
	}
}

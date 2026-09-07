import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { VersionInfo } from "@snapshot/contracts";

import { VERSION_CACHE_TTL_MS } from "../../common/constants.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { RELEASE_CHECKER, type ReleaseChecker } from "./release-checker.js";

function isNewer(latest: string, current: string): boolean {
	const core = (value: string): number[] =>
		(value.replace(/^v/, "").split("-")[0] ?? "").split(".").map((part) => Number.parseInt(part, 10) || 0);

	const a = core(latest);
	const b = core(current);

	for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
		const left = a[index] ?? 0;
		const right = b[index] ?? 0;

		if (left !== right) {
			return left > right;
		}
	}

	return false;
}

@Injectable()
export class VersionService implements OnModuleInit {
	private latest: string | null = null;
	private checkedAt: string | null = null;
	private lastCheckMs = 0;

	constructor(
		@Inject(RELEASE_CHECKER) private readonly checker: ReleaseChecker,
		private readonly config: AppConfigService,
	) {}

	async onModuleInit(): Promise<void> {
		if (this.config.isProduction) {
			await this.refresh();
		}
	}

	async refresh(): Promise<void> {
		this.lastCheckMs = Date.now();
		this.latest = await this.checker.latestVersion();
		this.checkedAt = new Date().toISOString();
	}

	getVersionInfo(): VersionInfo {
		if (!this.config.isProduction) {
			return { current: "development", latest: null, updateAvailable: false, checkedAt: null };
		}

		if (this.checkedAt !== null && Date.now() - this.lastCheckMs > VERSION_CACHE_TTL_MS) {
			void this.refresh();
		}

		const current = this.config.env.APP_VERSION ?? null;

		return {
			current,
			latest: this.latest,
			updateAvailable: current !== null && this.latest !== null && isNewer(this.latest, current),
			checkedAt: this.checkedAt,
		};
	}
}

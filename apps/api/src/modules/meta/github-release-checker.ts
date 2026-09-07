import { Injectable, Logger } from "@nestjs/common";

import { RELEASES_URL, VERSION_CHECK_TIMEOUT_MS } from "../../common/constants.js";
import type { ReleaseChecker } from "./release-checker.js";

@Injectable()
export class GithubReleaseChecker implements ReleaseChecker {
	private readonly logger = new Logger(GithubReleaseChecker.name);

	async latestVersion(): Promise<string | null> {
		try {
			const response = await fetch(RELEASES_URL, {
				headers: { Accept: "application/vnd.github+json", "User-Agent": "snapshot" },
				signal: AbortSignal.timeout(VERSION_CHECK_TIMEOUT_MS),
			});

			if (!response.ok) {
				return null;
			}

			const body = (await response.json()) as { tag_name?: unknown };

			return typeof body.tag_name === "string" ? body.tag_name.replace(/^v/, "") : null;
		} catch (error) {
			this.logger.warn({ err: error }, "Version check failed");
			return null;
		}
	}
}

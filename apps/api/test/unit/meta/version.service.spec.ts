import { describe, expect, it } from "vitest";

import type { AppConfigService } from "../../../src/config/app-config.service.js";
import type { ReleaseChecker } from "../../../src/modules/meta/release-checker.js";
import { VersionService } from "../../../src/modules/meta/version.service.js";

const checker = (latest: string | null): ReleaseChecker => ({
	latestVersion: () => Promise.resolve(latest),
});

const config = (isProduction: boolean, appVersion?: string): AppConfigService =>
	({ isProduction, env: { APP_VERSION: appVersion } }) as AppConfigService;

describe("VersionService", () => {
	it("reports an update when the latest release is newer", async () => {
		const service = new VersionService(checker("9.9.9"), config(true, "1.0.0"));
		await service.refresh();

		const info = service.getVersionInfo();
		expect(info.current).toBe("1.0.0");
		expect(info.latest).toBe("9.9.9");
		expect(info.updateAvailable).toBe(true);
		expect(info.checkedAt).not.toBeNull();
	});

	it("reports no update for an older release", async () => {
		const service = new VersionService(checker("1.0.0"), config(true, "1.0.0"));
		await service.refresh();

		expect(service.getVersionInfo().updateAvailable).toBe(false);
	});

	it("degrades gracefully when no release is available", async () => {
		const service = new VersionService(checker(null), config(true, "1.0.0"));
		await service.refresh();

		const info = service.getVersionInfo();
		expect(info.latest).toBeNull();
		expect(info.updateAvailable).toBe(false);
	});

	it("reports no version when the build was never stamped", async () => {
		const service = new VersionService(checker("9.9.9"), config(true));
		await service.refresh();

		const info = service.getVersionInfo();
		expect(info.current).toBeNull();
		expect(info.latest).toBe("9.9.9");
		expect(info.updateAvailable).toBe(false);
	});

	it("skips the GitHub check outside production and reports development", async () => {
		const service = new VersionService(checker("9.9.9"), config(false));
		await service.onModuleInit();

		const info = service.getVersionInfo();
		expect(info.current).toBe("development");
		expect(info.latest).toBeNull();
		expect(info.updateAvailable).toBe(false);
		expect(info.checkedAt).toBeNull();
	});
});

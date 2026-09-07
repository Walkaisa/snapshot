import type { VersionInfo } from "@snapshot/contracts";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OverviewStats } from "@/components/dashboard/overview-stats";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const { fetchOverviewMock } = vi.hoisted(() => ({ fetchOverviewMock: vi.fn() }));

vi.mock("@/lib/api/dashboard", () => ({
	RECENT_UPLOADS_LIMIT: 5,
	fetchOverview: fetchOverviewMock,
	fetchRecentUploads: vi.fn(),
	fetchConfigView: vi.fn(),
}));

const overview = {
	uploads: { count: 42, totalSizeBytes: 52_428_800, totalSizeHuman: "50.0 MB" },
	views: { page: 3, raw: 4, download: 0, total: 7 },
	links: { count: 5, visits: 18 },
	sessions: { active: 1 },
	version: { current: "2.0.0-dev", latest: "2.0.0-dev", updateAvailable: false, checkedAt: null } satisfies VersionInfo,
};

function withVersion(version: Partial<VersionInfo>) {
	return { ...overview, version: { ...overview.version, ...version } };
}

describe("OverviewStats", () => {
	it("renders the metric cards from the query", async () => {
		fetchOverviewMock.mockResolvedValue(overview);
		renderWithProviders(<OverviewStats />);

		expect(await screen.findByText("42")).toBeInTheDocument();
		expect(screen.getByText("50.0 MB")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("2.0.0-dev")).toBeInTheDocument();
	});

	it("says the instance is current when no newer release exists", async () => {
		fetchOverviewMock.mockResolvedValue(overview);
		renderWithProviders(<OverviewStats />);

		expect(await screen.findByText(en.update.upToDate)).toBeInTheDocument();
	});

	it("names the newer release on the version card", async () => {
		fetchOverviewMock.mockResolvedValue(withVersion({ latest: "2.1.0", updateAvailable: true }));
		renderWithProviders(<OverviewStats />);

		expect(await screen.findByText(en.update.available.replace("{latest}", "2.1.0"))).toBeInTheDocument();
	});

	it("claims nothing when the release check came back empty", async () => {
		fetchOverviewMock.mockResolvedValue(withVersion({ latest: null }));
		renderWithProviders(<OverviewStats />);

		expect(await screen.findByText("2.0.0-dev")).toBeInTheDocument();
		expect(screen.queryByText(en.update.upToDate)).not.toBeInTheDocument();
	});

	it("shows the error state with a retry action", async () => {
		fetchOverviewMock.mockRejectedValue(new Error("boom"));
		renderWithProviders(<OverviewStats />);

		expect(await screen.findByText("Could not load this data.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});

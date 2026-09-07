import type { UploadActivity } from "@snapshot/contracts";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActivityCharts } from "@/components/dashboard/activity-charts";
import { StorageFormats } from "@/components/dashboard/storage-formats";
import { renderWithProviders } from "../utils";

class SizedResizeObserver {
	constructor(private readonly callback: ResizeObserverCallback) {}

	observe(target: Element): void {
		const contentRect = { width: 640, height: 280, top: 0, left: 0, bottom: 280, right: 640, x: 0, y: 0 };

		this.callback([{ target, contentRect } as ResizeObserverEntry], this as unknown as ResizeObserver);
	}

	unobserve(): void {}
	disconnect(): void {}
}

globalThis.ResizeObserver = SizedResizeObserver as unknown as typeof globalThis.ResizeObserver;

const { fetchActivityMock, fetchBreakdownMock } = vi.hoisted(() => ({
	fetchActivityMock: vi.fn(),
	fetchBreakdownMock: vi.fn(),
}));

vi.mock("@/lib/api/stats", () => ({
	activityPath: (days: number) => `/api/stats/activity?days=${days}`,
	STORAGE_BREAKDOWN_PATH: "/api/stats/breakdown",
	fetchActivity: fetchActivityMock,
	fetchStorageBreakdown: fetchBreakdownMock,
}));

function activity(days: number): UploadActivity {
	const points = Array.from({ length: days }, (_unused, index) => ({
		date: `2026-07-${String(index + 1).padStart(2, "0")}`,
		uploads: index + 1,
		bytes: (index + 1) * 1024,
		pageViews: index * 2,
		rawViews: index,
		downloadViews: 1,
		linkVisits: index,
	}));

	return {
		days,
		from: "2026-07-01",
		to: `2026-07-${String(days).padStart(2, "0")}`,
		startingBytes: 1_048_576,
		points,
		totals: { uploads: 21, bytes: 21_504, views: 42 },
		previous: { uploads: 14, bytes: 14_336, views: 30 },
	};
}

describe("ActivityCharts", () => {
	it("renders every chart card with its headline figure", async () => {
		fetchActivityMock.mockResolvedValue(activity(7));
		renderWithProviders(<ActivityCharts />);

		const uploads = (await screen.findByText("Upload activity")).closest("[data-slot='card']");
		const views = screen.getByText("Views").closest("[data-slot='card']");

		expect(uploads).not.toBeNull();
		expect(views).not.toBeNull();
		expect(within(uploads as HTMLElement).getByText("21")).toBeInTheDocument();
		expect(within(views as HTMLElement).getByText("42")).toBeInTheDocument();
		expect(screen.getByText("Storage used")).toBeInTheDocument();
		expect(screen.getByText("1.0 MB")).toBeInTheDocument();
	});

	it("labels the stacked view series so identity never rests on colour alone", async () => {
		fetchActivityMock.mockResolvedValue(activity(7));
		renderWithProviders(<ActivityCharts />);

		for (const label of ["Share page", "Direct link", "Download", "Short link"]) {
			expect(await screen.findByText(label)).toBeInTheDocument();
		}
	});

	it("gives every legend entry a swatch in its own series colour, top band first", async () => {
		fetchActivityMock.mockResolvedValue(activity(7));
		const { container } = renderWithProviders(<ActivityCharts />);

		await screen.findByText("Share page");

		const entries = [...container.querySelectorAll<HTMLElement>("li:has(> span[style*='background-color'])")];

		expect(entries.map((entry) => entry.textContent)).toEqual(["Share page", "Direct link", "Download", "Short link"]);
		expect(entries.map((entry) => entry.querySelector("span")?.style.backgroundColor)).toEqual([
			"var(--chart-1)",
			"var(--chart-2)",
			"var(--chart-3)",
			"var(--chart-4)",
		]);
	});

	it("refetches against the picked window and moves the switch to it", async () => {
		fetchActivityMock.mockImplementation((days: number) => Promise.resolve(activity(days)));
		renderWithProviders(<ActivityCharts />);

		await screen.findByText("Upload activity");
		expect(fetchActivityMock).toHaveBeenCalledWith(30);
		expect(screen.getByRole("radio", { name: "30 days" })).toBeChecked();

		await userEvent.click(screen.getByRole("radio", { name: "7 days" }));

		await waitFor(() => expect(fetchActivityMock).toHaveBeenCalledWith(7));
		expect(screen.getByRole("radio", { name: "7 days" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "30 days" })).not.toBeChecked();
	});

	it("exposes the range switch as a single-selection radio group", async () => {
		fetchActivityMock.mockResolvedValue(activity(7));
		renderWithProviders(<ActivityCharts />);

		const group = await screen.findByRole("radiogroup", { name: "Time range" });

		expect(
			within(group)
				.getAllByRole("radio")
				.map((radio) => radio.textContent),
		).toEqual(["7 days", "30 days", "90 days"]);
	});

	it("surfaces a retry when the range request fails", async () => {
		fetchActivityMock.mockRejectedValue(new Error("boom"));
		renderWithProviders(<ActivityCharts />);

		expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});

describe("StorageFormats", () => {
	it("folds everything past the top six into a single other slice", async () => {
		fetchBreakdownMock.mockResolvedValue({
			formats: [
				{ extension: "png", count: 187, bytes: 7_000_000 },
				{ extension: "gif", count: 33, bytes: 6_000_000 },
				{ extension: "jpg", count: 52, bytes: 5_000_000 },
				{ extension: "webp", count: 24, bytes: 4_000_000 },
				{ extension: "mp4", count: 1, bytes: 3_000_000 },
				{ extension: "svg", count: 7, bytes: 2_000_000 },
				{ extension: "pdf", count: 2, bytes: 1_000_000 },
				{ extension: "txt", count: 4, bytes: 500_000 },
			],
		});
		renderWithProviders(<StorageFormats />);

		expect(await screen.findAllByText(".png")).not.toHaveLength(0);
		expect(screen.getAllByText("Other")).not.toHaveLength(0);
		expect(screen.queryAllByText(".pdf")).toHaveLength(0);
	});

	it("shows the empty state when nothing is stored", async () => {
		fetchBreakdownMock.mockResolvedValue({ formats: [] });
		renderWithProviders(<StorageFormats />);

		expect(await screen.findByText("Nothing stored yet.")).toBeInTheDocument();
	});
});

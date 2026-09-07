import { describe, expect, it } from "vitest";

import { buildActivityPoints, shiftDays, sumTotals, utcDayKey, utcDayStart } from "../../../src/modules/stats/activity-series.js";

const from = new Date("2026-07-01T00:00:00Z");

describe("utcDayStart", () => {
	it("floors to midnight UTC regardless of the time of day", () => {
		expect(utcDayStart(new Date("2026-07-15T23:59:59.999Z")).toISOString()).toBe("2026-07-15T00:00:00.000Z");
	});
});

describe("shiftDays", () => {
	it("moves forwards and backwards across a month boundary", () => {
		expect(utcDayKey(shiftDays(from, -1))).toBe("2026-06-30");
		expect(utcDayKey(shiftDays(from, 31))).toBe("2026-08-01");
	});
});

describe("buildActivityPoints", () => {
	it("materialises every day in the window, including days with no rows", () => {
		const points = buildActivityPoints(from, 3, [], [], []);

		expect(points.map((point) => point.date)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
		expect(points.every((point) => point.uploads === 0 && point.bytes === 0)).toBe(true);
	});

	it("folds upload, view and link-visit rows into their day", () => {
		const points = buildActivityPoints(
			from,
			2,
			[{ date: "2026-07-02", count: 3, bytes: 900 }],
			[
				{ date: "2026-07-01", viewType: "page", count: 5 },
				{ date: "2026-07-02", viewType: "raw", count: 2 },
				{ date: "2026-07-02", viewType: "download", count: 1 },
			],
			[{ date: "2026-07-02", count: 7 }],
		);

		expect(points[0]).toEqual({
			date: "2026-07-01",
			uploads: 0,
			bytes: 0,
			pageViews: 5,
			rawViews: 0,
			downloadViews: 0,
			linkVisits: 0,
		});
		expect(points[1]).toEqual({
			date: "2026-07-02",
			uploads: 3,
			bytes: 900,
			pageViews: 0,
			rawViews: 2,
			downloadViews: 1,
			linkVisits: 7,
		});
	});

	it("ignores rows outside the window so one query can serve two adjacent ranges", () => {
		const points = buildActivityPoints(
			from,
			1,
			[
				{ date: "2026-06-30", count: 9, bytes: 9 },
				{ date: "2026-07-01", count: 1, bytes: 10 },
			],
			[{ date: "2026-07-02", viewType: "page", count: 4 }],
			[{ date: "2026-06-30", count: 3 }],
		);

		expect(points).toEqual([{ date: "2026-07-01", uploads: 1, bytes: 10, pageViews: 0, rawViews: 0, downloadViews: 0, linkVisits: 0 }]);
	});
});

describe("sumTotals", () => {
	it("adds every view type and link visits into a single view total", () => {
		const points = buildActivityPoints(
			from,
			2,
			[
				{ date: "2026-07-01", count: 2, bytes: 100 },
				{ date: "2026-07-02", count: 1, bytes: 50 },
			],
			[
				{ date: "2026-07-01", viewType: "page", count: 3 },
				{ date: "2026-07-02", viewType: "raw", count: 4 },
				{ date: "2026-07-02", viewType: "download", count: 5 },
			],
			[{ date: "2026-07-01", count: 6 }],
		);

		expect(sumTotals(points)).toEqual({ uploads: 3, bytes: 150, views: 18 });
	});

	it("returns zeroes for an empty window", () => {
		expect(sumTotals([])).toEqual({ uploads: 0, bytes: 0, views: 0 });
	});
});

import type { ActivityPoint, ActivityTotals } from "@snapshot/contracts";

import type { LinkVisitDailyRow } from "../../db/repositories/link-visit.repository.js";
import type { UploadDailyRow } from "../../db/repositories/upload.repository.js";
import type { ViewDailyRow } from "../../db/repositories/upload-view.repository.js";

const DAY_MS = 86_400_000;

export function utcDayStart(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function shiftDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * DAY_MS);
}

export function utcDayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function emptyPoint(date: string): ActivityPoint {
	return { date, uploads: 0, bytes: 0, pageViews: 0, rawViews: 0, downloadViews: 0, linkVisits: 0 };
}

export function buildActivityPoints(
	from: Date,
	days: number,
	uploads: UploadDailyRow[],
	views: ViewDailyRow[],
	linkVisits: LinkVisitDailyRow[],
): ActivityPoint[] {
	const points = new Map<string, ActivityPoint>();

	for (let offset = 0; offset < days; offset += 1) {
		const date = utcDayKey(shiftDays(from, offset));
		points.set(date, emptyPoint(date));
	}

	for (const row of uploads) {
		const point = points.get(row.date);

		if (point !== undefined) {
			point.uploads += row.count;
			point.bytes += row.bytes;
		}
	}

	for (const row of views) {
		const point = points.get(row.date);

		if (point === undefined) {
			continue;
		}

		if (row.viewType === "page") {
			point.pageViews += row.count;
		} else if (row.viewType === "raw") {
			point.rawViews += row.count;
		} else {
			point.downloadViews += row.count;
		}
	}

	for (const row of linkVisits) {
		const point = points.get(row.date);

		if (point !== undefined) {
			point.linkVisits += row.count;
		}
	}

	return [...points.values()];
}

export function sumTotals(points: ActivityPoint[]): ActivityTotals {
	return points.reduce<ActivityTotals>(
		(totals, point) => ({
			uploads: totals.uploads + point.uploads,
			bytes: totals.bytes + point.bytes,
			views: totals.views + point.pageViews + point.rawViews + point.downloadViews + point.linkVisits,
		}),
		{ uploads: 0, bytes: 0, views: 0 },
	);
}

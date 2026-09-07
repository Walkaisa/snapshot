import { describe, expect, it } from "vitest";

import type { StoredFile } from "../../../src/modules/uploads/storage.service.js";
import { planReconciliation } from "../../../src/modules/uploads/upload-reconciler.service.js";

const file = (id: string): StoredFile => ({
	id,
	extension: "png",
	filename: `${id}.png`,
	sizeBytes: 1,
	modifiedAt: new Date("2026-07-10T00:00:00Z"),
});

describe("planReconciliation", () => {
	it("flags files on disk that the database does not know", () => {
		const plan = planReconciliation([file("a"), file("b")], ["a"]);

		expect(plan.untracked.map((entry) => entry.id)).toEqual(["b"]);
		expect(plan.orphans).toEqual([]);
	});

	it("flags rows whose file has disappeared", () => {
		const plan = planReconciliation([file("a")], ["a", "gone"]);

		expect(plan.untracked).toEqual([]);
		expect(plan.orphans).toEqual(["gone"]);
	});

	it("reports nothing when disk and database agree", () => {
		const plan = planReconciliation([file("a")], ["a"]);

		expect(plan).toEqual({ untracked: [], orphans: [] });
	});

	it("handles an empty directory against an empty table", () => {
		expect(planReconciliation([], [])).toEqual({ untracked: [], orphans: [] });
	});
});

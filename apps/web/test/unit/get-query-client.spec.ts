import { describe, expect, it } from "vitest";

import { createQueryClient } from "@/lib/get-query-client";

describe("createQueryClient", () => {
	it("keeps independently dehydrated server trees isolated", () => {
		const layoutClient = createQueryClient();
		const pageClient = createQueryClient();

		layoutClient.setQueryData(["auth", "session"], { username: "admin" });
		pageClient.setQueryData(["uploads", "list"], { items: [] });

		expect(layoutClient.getQueryData(["uploads", "list"])).toBeUndefined();
		expect(pageClient.getQueryData(["auth", "session"])).toBeUndefined();
	});
});

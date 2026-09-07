import { describe, expect, it } from "vitest";

import {
	LINK_SEARCH_MAX_LENGTH,
	LINK_SLUG_MAX_LENGTH,
	LINK_SORT_FIELDS,
	LINK_TARGET_MAX_LENGTH,
	linkCreateSchema,
	linkListQuerySchema,
	linkSchema,
	linkSlugSchema,
	linkTargetSchema,
	linkUpdateSchema,
	publicLinkSchema,
} from "../src/links.js";
import { resolvedIdSchema } from "../src/resolve.js";

const sampleLink = {
	slug: "launch",
	targetUrl: "https://example.com/a/very/long/link",
	visits: 12,
	createdAt: "2026-09-04T12:00:00+00:00",
	shortUrl: "https://img.example.com/launch",
	deleteUrl: "https://img.example.com/api/links/launch",
};

describe("linkSlugSchema", () => {
	it.each(["a", "launch", "spring-sale", "v2_beta", "A1"])("accepts %j", (value) => {
		expect(linkSlugSchema.parse(value)).toBe(value);
	});

	it("trims surrounding whitespace", () => {
		expect(linkSlugSchema.parse("  launch  ")).toBe("launch");
	});

	it.each(["", "-lead", "trail-", "_lead", "has space", "has.dot", "sla/sh", "../escape"])("rejects %j", (value) => {
		expect(linkSlugSchema.safeParse(value).success).toBe(false);
	});

	it(`rejects more than ${LINK_SLUG_MAX_LENGTH} characters`, () => {
		expect(linkSlugSchema.safeParse("a".repeat(LINK_SLUG_MAX_LENGTH)).success).toBe(true);
		expect(linkSlugSchema.safeParse("a".repeat(LINK_SLUG_MAX_LENGTH + 1)).success).toBe(false);
	});
});

describe("linkTargetSchema", () => {
	it.each(["https://example.com", "http://example.com/path?a=1#b", "https://example.com:8443/deep/path"])("accepts %j", (value) => {
		expect(linkTargetSchema.parse(value)).toBe(value);
	});

	it.each(["javascript:alert(1)", "data:text/html,<script>", "ftp://example.com/file", "example.com", "", "//example.com"])(
		"rejects %j",
		(value) => {
			expect(linkTargetSchema.safeParse(value).success).toBe(false);
		},
	);

	it(`rejects more than ${LINK_TARGET_MAX_LENGTH} characters`, () => {
		const long = `https://example.com/${"a".repeat(LINK_TARGET_MAX_LENGTH)}`;

		expect(linkTargetSchema.safeParse(long).success).toBe(false);
	});
});

describe("linkCreateSchema", () => {
	it("takes a url on its own", () => {
		expect(linkCreateSchema.parse({ url: "https://example.com" })).toEqual({ url: "https://example.com" });
	});

	it("takes an optional custom slug", () => {
		expect(linkCreateSchema.parse({ url: "https://example.com", slug: "launch" }).slug).toBe("launch");
	});

	it("rejects unknown fields", () => {
		expect(linkCreateSchema.safeParse({ url: "https://example.com", visits: 5 }).success).toBe(false);
	});

	it("rejects a missing url", () => {
		expect(linkCreateSchema.safeParse({ slug: "launch" }).success).toBe(false);
	});
});

describe("linkUpdateSchema", () => {
	it("only takes the destination", () => {
		expect(linkUpdateSchema.parse({ url: "https://example.com/next" }).url).toBe("https://example.com/next");
		expect(linkUpdateSchema.safeParse({ url: "https://example.com", slug: "other" }).success).toBe(false);
	});
});

describe("linkListQuerySchema", () => {
	it("coerces string query params and applies defaults", () => {
		expect(linkListQuerySchema.parse({ page: "2", perPage: "10" })).toEqual({
			page: 2,
			perPage: 10,
			sort: "createdAt",
			order: "desc",
			search: "",
		});
		expect(linkListQuerySchema.parse({}).page).toBe(1);
	});

	it("caps perPage at 100", () => {
		expect(linkListQuerySchema.safeParse({ perPage: "1000" }).success).toBe(false);
	});

	it("takes every sortable column in either direction", () => {
		for (const sort of LINK_SORT_FIELDS) {
			expect(linkListQuerySchema.parse({ sort, order: "asc" }).sort).toBe(sort);
		}

		expect(linkListQuerySchema.parse({ order: "asc" }).order).toBe("asc");
	});

	it("rejects a column it cannot sort by", () => {
		expect(linkListQuerySchema.safeParse({ sort: "deleteUrl" }).success).toBe(false);
		expect(linkListQuerySchema.safeParse({ order: "sideways" }).success).toBe(false);
	});

	it("trims the search term and caps its length", () => {
		expect(linkListQuerySchema.parse({ search: "  launch  " }).search).toBe("launch");
		expect(linkListQuerySchema.safeParse({ search: "x".repeat(LINK_SEARCH_MAX_LENGTH + 1) }).success).toBe(false);
	});
});

describe("link payloads", () => {
	it("parses a full link payload", () => {
		expect(linkSchema.parse(sampleLink).slug).toBe("launch");
	});

	it("public subset carries only what a redirect needs", () => {
		const publicLink = publicLinkSchema.parse(sampleLink);

		expect(publicLink).toEqual({ slug: "launch", targetUrl: sampleLink.targetUrl });
	});
});

describe("resolvedIdSchema", () => {
	it("accepts the link branch", () => {
		const resolved = resolvedIdSchema.parse({ kind: "link", link: { slug: "launch", targetUrl: sampleLink.targetUrl } });

		expect(resolved.kind).toBe("link");
	});

	it("rejects a branch without its payload", () => {
		expect(resolvedIdSchema.safeParse({ kind: "link" }).success).toBe(false);
		expect(resolvedIdSchema.safeParse({ kind: "unknown" }).success).toBe(false);
	});
});

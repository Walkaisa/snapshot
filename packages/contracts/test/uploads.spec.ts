import { describe, expect, it } from "vitest";

import {
	formatCreatedAt,
	isMediaExtension,
	isMediaMimeType,
	MEDIA_EXTENSIONS,
	MEDIA_MIME_TYPES,
	mediaKind,
	mimeTypesForExtension,
	publicUploadSchema,
	uploadIdSchema,
	uploadListQuerySchema,
	uploadSchema,
	viewTypeSchema,
} from "../src/uploads.js";

const sampleEmbed = {
	enabled: true,
	providerName: "Snapshot",
	themeColor: "#5865F2",
	title: "abc123XYZ9.png",
	description: "12.1 KB",
	locale: "en_US",
};

const sampleUpload = {
	id: "abc123XYZ9",
	extension: "png",
	mimeType: "image/png",
	sizeBytes: 12345,
	sizeHuman: "12.1 KB",
	checksumSha256: "a".repeat(64),
	width: 730,
	height: 476,
	createdAt: "2026-07-09T12:00:00+00:00",
	thumbnailUrl: null,
	url: "https://img.example.com/abc123XYZ9",
	pageUrl: "https://img.example.com/abc123XYZ9",
	rawUrl: "https://img.example.com/raw/abc123XYZ9.png",
	deleteUrl: "https://img.example.com/api/v1/uploads/abc123XYZ9",
};

describe("uploadIdSchema", () => {
	it.each(["abc123XYZ9", "A1B2C3", "a-b_c1"])("accepts %s", (value) => {
		expect(uploadIdSchema.parse(value)).toBe(value);
	});

	it.each(["ab", "../escape", "bad name", "with.dot", "x".repeat(65), ""])("rejects %j", (value) => {
		expect(uploadIdSchema.safeParse(value).success).toBe(false);
	});
});

describe("viewTypeSchema", () => {
	it("accepts the three tracked kinds", () => {
		expect(viewTypeSchema.options).toEqual(["page", "raw", "download"]);
	});

	it("rejects anything else", () => {
		expect(viewTypeSchema.safeParse("stream").success).toBe(false);
	});
});

describe("uploadListQuerySchema", () => {
	it("coerces string query params and applies defaults", () => {
		expect(uploadListQuerySchema.parse({ page: "2", perPage: "10" })).toEqual({
			page: 2,
			perPage: 10,
		});
		expect(uploadListQuerySchema.parse({})).toEqual({ page: 1, perPage: 50 });
	});

	it("caps perPage at 100", () => {
		expect(uploadListQuerySchema.safeParse({ perPage: "1000" }).success).toBe(false);
	});
});

describe("upload payloads", () => {
	it("parses a full upload payload", () => {
		expect(uploadSchema.parse(sampleUpload).id).toBe("abc123XYZ9");
	});

	it("public subset excludes the delete URL and carries the rendered embed", () => {
		const { url: _url, deleteUrl: _deleteUrl, ...rest } = sampleUpload;
		const publicUpload = publicUploadSchema.parse({
			...rest,
			downloadUrl: `${sampleUpload.rawUrl}?download=1`,
			embed: sampleEmbed,
		});
		expect(publicUpload).not.toHaveProperty("deleteUrl");
		expect(publicUpload.embed.title).toBe("abc123XYZ9.png");
	});

	it("allows null dimensions for a container without them", () => {
		expect(uploadSchema.parse({ ...sampleUpload, width: null, height: null }).width).toBeNull();
	});

	it("rejects a zero dimension", () => {
		expect(uploadSchema.safeParse({ ...sampleUpload, width: 0 }).success).toBe(false);
	});

	it("requires the embed payload on the public subset", () => {
		const { url: _url, deleteUrl: _deleteUrl, ...rest } = sampleUpload;
		const result = publicUploadSchema.safeParse({
			...rest,
			downloadUrl: `${sampleUpload.rawUrl}?download=1`,
		});
		expect(result.success).toBe(false);
	});
});

describe("mediaKind", () => {
	it.each([
		["image/png", "image"],
		["image/gif; charset=binary", "image"],
		["VIDEO/MP4", "video"],
		["application/pdf", "unknown"],
		["", "unknown"],
	])("maps %j to %s", (mimeType, expected) => {
		expect(mediaKind(mimeType)).toBe(expected);
	});
});

describe("media registry", () => {
	it("maps an extension to its permitted mime types", () => {
		expect(mimeTypesForExtension(".png")).toContain("image/png");
		expect(mimeTypesForExtension(".mov")).toContain("video/quicktime");
		expect(mimeTypesForExtension(".unknown")).toEqual([]);
	});

	it("normalizes the extension it is given", () => {
		expect(mimeTypesForExtension("PNG")).toEqual(mimeTypesForExtension(".png"));
	});

	it("exposes the media allow-lists", () => {
		expect(MEDIA_EXTENSIONS).toContain(".png");
		expect(MEDIA_MIME_TYPES).toContain("image/png");
	});

	it.each([".png", ".mp4", ".webm"])("accepts %s as media", (extension) => {
		expect(isMediaExtension(extension)).toBe(true);
	});

	it.each([".txt", ".pdf", ".zip", ".svg", ""])("refuses %j as media", (extension) => {
		expect(isMediaExtension(extension)).toBe(false);
	});

	it.each(["image/png", "VIDEO/MP4", "image/gif; charset=binary"])("accepts %j as a media mime type", (mimeType) => {
		expect(isMediaMimeType(mimeType)).toBe(true);
	});

	it.each(["text/plain", "application/pdf", "image/svg+xml", "image/heic", ""])("refuses %j as a media mime type", (mimeType) => {
		expect(isMediaMimeType(mimeType)).toBe(false);
	});
});

describe("formatCreatedAt", () => {
	const iso = "2026-07-07T16:58:59.000Z";

	it("renders in the configured timezone using a BCP-47 locale", () => {
		expect(formatCreatedAt(iso, "de_DE", "Europe/Berlin")).toBe("7.7.2026, 18:58:59");
	});

	it("shifts with the timezone", () => {
		expect(formatCreatedAt(iso, "en_US", "UTC")).toMatch(/7\/7\/2026, 4:58:59/);
	});
});

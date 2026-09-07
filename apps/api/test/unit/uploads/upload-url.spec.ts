import { describe, expect, it } from "vitest";

import { buildPublicUploadUrls, buildUploadUrls } from "../../../src/modules/uploads/upload-url.js";

const BASE = "https://img.example.com";

describe("buildUploadUrls", () => {
	it("builds the authenticated url set", () => {
		expect(buildUploadUrls(BASE, "abc123", "abc123.png", false)).toEqual({
			url: "https://img.example.com/abc123",
			pageUrl: "https://img.example.com/abc123",
			rawUrl: "https://img.example.com/raw/abc123.png",
			thumbnailUrl: null,
			deleteUrl: "https://img.example.com/api/uploads/abc123",
		});
	});

	it("points at the thumbnail only once one exists", () => {
		expect(buildUploadUrls(BASE, "abc123", "abc123.mp4", true).thumbnailUrl).toBe("https://img.example.com/raw/thumbnail/abc123");
	});
});

describe("buildPublicUploadUrls", () => {
	it("builds the public url set with a download link and no delete url", () => {
		const urls = buildPublicUploadUrls(BASE, "abc123", "abc123.png", false);

		expect(urls).toEqual({
			pageUrl: "https://img.example.com/abc123",
			rawUrl: "https://img.example.com/raw/abc123.png",
			thumbnailUrl: null,
			downloadUrl: "https://img.example.com/raw/abc123.png?download=1",
		});
		expect(urls).not.toHaveProperty("deleteUrl");
	});

	it("shares the thumbnail so an embed can use it as the poster", () => {
		expect(buildPublicUploadUrls(BASE, "abc123", "abc123.mp4", true).thumbnailUrl).toBe("https://img.example.com/raw/thumbnail/abc123");
	});
});

import type { PublicUpload } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";

import { shareMetadata } from "@/lib/share-metadata";

function uploadWith(
	mimeType: string,
	{
		embedEnabled = true,
		width = 730,
		height = 476,
		thumbnailUrl = null,
	}: { embedEnabled?: boolean; width?: number | null; height?: number | null; thumbnailUrl?: string | null } = {},
): PublicUpload {
	return {
		id: "abc123XYZ9",
		extension: mimeType.split("/")[1] ?? "bin",
		mimeType,
		sizeBytes: 12_345,
		sizeHuman: "12.1 KB",
		checksumSha256: "a".repeat(64),
		width,
		height,
		createdAt: "2026-07-09T12:00:00+00:00",
		thumbnailUrl,
		pageUrl: "https://img.example.com/abc123XYZ9",
		rawUrl: "https://img.example.com/raw/abc123XYZ9.png",
		downloadUrl: "https://img.example.com/raw/abc123XYZ9.png?download=1",
		embed: {
			enabled: embedEnabled,
			providerName: "Snapshot",
			themeColor: "#5865F2",
			title: "abc123XYZ9.png",
			description: "12.1 KB",
			locale: "en_US",
		},
	};
}

describe("shareMetadata", () => {
	it("gives an image a large-image card and a sized og:image", () => {
		const meta = shareMetadata(uploadWith("image/png"));

		expect(meta.openGraph).toMatchObject({
			type: "website",
			siteName: "Snapshot",
			url: "https://img.example.com/abc123XYZ9",
			locale: "en_US",
			images: [{ url: "https://img.example.com/raw/abc123XYZ9.png", type: "image/png", width: 730, height: 476 }],
		});
		expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
		expect(meta.other).toEqual({ "og:theme-color": "#5865F2" });
	});

	it("gives a video a sized og:video with a video.other type", () => {
		const meta = shareMetadata(uploadWith("video/mp4"));

		expect(meta.openGraph).toMatchObject({
			type: "video.other",
			videos: [{ url: "https://img.example.com/raw/abc123XYZ9.png", type: "video/mp4", width: 730, height: 476 }],
		});
		expect(meta.openGraph).not.toHaveProperty("images");
		expect(meta.twitter).toMatchObject({ card: "summary" });
	});

	it("hands a video's generated still to the unfurl as its poster", () => {
		const thumbnailUrl = "https://img.example.com/raw/thumbnail/abc123XYZ9";
		const meta = shareMetadata(uploadWith("video/mp4", { thumbnailUrl }));

		expect(meta.openGraph).toMatchObject({ images: [{ url: thumbnailUrl, type: "image/webp" }] });
		expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: [thumbnailUrl] });
	});

	it("omits the size keys when the container gave no dimensions", () => {
		const meta = shareMetadata(uploadWith("video/webm", { width: null, height: null }));
		const [video] = (meta.openGraph as { videos: Record<string, unknown>[] }).videos;

		expect(video).not.toHaveProperty("width");
		expect(video).not.toHaveProperty("height");
	});

	it("falls back to a plain summary for unknown media", () => {
		const meta = shareMetadata(uploadWith("application/pdf"));

		expect(meta.openGraph).toMatchObject({ type: "website" });
		expect(meta.openGraph).not.toHaveProperty("images");
		expect(meta.openGraph).not.toHaveProperty("videos");
		expect(meta.twitter).toMatchObject({ card: "summary" });
	});

	it("emits no unfurl tags when embeds are disabled", () => {
		const meta = shareMetadata(uploadWith("image/png", { embedEnabled: false }));

		expect(meta).toEqual({ title: "abc123XYZ9.png" });
	});
});

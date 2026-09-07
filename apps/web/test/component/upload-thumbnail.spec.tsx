import type { Upload } from "@snapshot/contracts";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadThumbnail } from "@/components/gallery/upload-thumbnail";

class ImmediateIntersectionObserver {
	constructor(private readonly callback: IntersectionObserverCallback) {}

	observe(target: Element): void {
		this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
	}

	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): [] {
		return [];
	}
}

globalThis.IntersectionObserver = ImmediateIntersectionObserver as unknown as typeof globalThis.IntersectionObserver;

const createImageBitmapMock = vi.fn(async () => ({ width: 480, height: 270, close: vi.fn() }) as unknown as ImageBitmap);

globalThis.createImageBitmap = createImageBitmapMock as unknown as typeof globalThis.createImageBitmap;

function upload(extension: string, mimeType: string, thumbnailUrl: string | null = null): Upload {
	return {
		id: "abc123XYZ9",
		extension,
		mimeType,
		sizeBytes: 1024,
		sizeHuman: "1.0 KB",
		checksumSha256: "a".repeat(64),
		width: 480,
		height: 270,
		createdAt: "2026-07-12T09:00:00+00:00",
		url: `https://img.example.com/abc123XYZ9`,
		pageUrl: `https://img.example.com/abc123XYZ9`,
		rawUrl: `https://img.example.com/raw/abc123XYZ9.${extension}`,
		thumbnailUrl,
		deleteUrl: "https://img.example.com/api/uploads/abc123XYZ9",
	};
}

describe("UploadThumbnail", () => {
	beforeEach(() => {
		createImageBitmapMock.mockClear();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(new Blob([new Uint8Array([0x47, 0x49, 0x46])]))),
		);
	});

	it("shows the server-rendered still whenever the API has one", () => {
		const thumbnail = "https://img.example.com/raw/thumbnail/abc123XYZ9";
		const { container } = render(<UploadThumbnail upload={upload("mp4", "video/mp4", thumbnail)} />);

		expect(container.querySelector("img")?.getAttribute("src")).toBe(thumbnail);
		expect(container.querySelector("video")).toBeNull();
		expect(createImageBitmapMock).not.toHaveBeenCalled();
	});

	it("paints a GIF as a decoded still so the grid never animates", async () => {
		const { container } = render(<UploadThumbnail upload={upload("gif", "image/gif")} />);

		expect(container.querySelector("canvas")).not.toBeNull();
		expect(container.querySelector("img")).toBeNull();

		await waitFor(() => expect(createImageBitmapMock).toHaveBeenCalledTimes(1));
	});

	it("serves a still image straight from the original", () => {
		const { container } = render(<UploadThumbnail upload={upload("png", "image/png")} />);

		expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.example.com/raw/abc123XYZ9.png");
		expect(container.querySelector("canvas")).toBeNull();
		expect(createImageBitmapMock).not.toHaveBeenCalled();
	});

	it("falls back to the original when the frame cannot be decoded", async () => {
		createImageBitmapMock.mockRejectedValueOnce(new Error("unsupported"));
		const { container } = render(<UploadThumbnail upload={upload("gif", "image/gif")} />);

		await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.example.com/raw/abc123XYZ9.gif"));
	});

	it("defers video posters to a muted, non-playing element", () => {
		const { container } = render(<UploadThumbnail upload={upload("mp4", "video/mp4")} />);
		const video = container.querySelector("video");

		expect(video).not.toBeNull();
		expect(video?.hasAttribute("autoplay")).toBe(false);
		expect(video?.getAttribute("preload")).toBe("metadata");
	});
});

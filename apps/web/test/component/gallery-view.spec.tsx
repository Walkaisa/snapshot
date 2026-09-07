import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GalleryView } from "@/components/gallery/gallery-view";
import { renderWithProviders } from "../utils";

const { fetchUploadsPageMock, fetchConfigViewMock } = vi.hoisted(() => ({
	fetchUploadsPageMock: vi.fn(),
	fetchConfigViewMock: vi.fn(),
}));

vi.mock("@/lib/api/gallery", () => ({
	GALLERY_PAGE_SIZE: 24,
	fetchUploadsPage: fetchUploadsPageMock,
	fetchUploadStats: vi.fn(),
	deleteUpload: vi.fn(),
	uploadFile: vi.fn(),
}));

vi.mock("@/lib/api/dashboard", () => ({
	RECENT_UPLOADS_LIMIT: 5,
	fetchOverview: vi.fn(),
	fetchRecentUploads: vi.fn(),
	fetchConfigView: fetchConfigViewMock,
}));

function upload(id: string, extension: string, mimeType: string) {
	return {
		id,
		extension,
		mimeType,
		sizeBytes: 1024,
		sizeHuman: "1.0 KB",
		checksumSha256: "a".repeat(64),
		width: 800,
		height: 600,
		createdAt: "2026-07-09T12:00:00+00:00",
		url: `https://img.example.com/${id}`,
		pageUrl: `https://img.example.com/${id}`,
		rawUrl: `https://img.example.com/raw/${id}.${extension}`,
		deleteUrl: `https://img.example.com/api/uploads/${id}`,
	};
}

describe("GalleryView", () => {
	beforeEach(() => {
		fetchConfigViewMock.mockResolvedValue({ allowedExtensions: null, allowedMimeTypes: null, maxFileSizeBytes: 26_214_400 });
	});

	it("renders a pin per upload with its filename", async () => {
		fetchUploadsPageMock.mockResolvedValue({
			items: [upload("alpha1", "png", "image/png"), upload("beta22", "mp4", "video/mp4")],
			total: 2,
			page: 1,
			perPage: 24,
		});

		renderWithProviders(<GalleryView baseUrl="https://img.example.com" />);

		expect(await screen.findByText("alpha1.png")).toBeInTheDocument();
		expect(screen.getByText("beta22.mp4")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open details for alpha1.png" })).toBeInTheDocument();
	});

	it("shows the empty state when there are no uploads", async () => {
		fetchUploadsPageMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 24 });

		renderWithProviders(<GalleryView baseUrl="https://img.example.com" />);

		expect(await screen.findByText("No uploads yet")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Set up ShareX" })).toBeInTheDocument();
	});
});

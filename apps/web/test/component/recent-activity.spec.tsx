import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecentActivity } from "@/components/dashboard/recent-activity";
import { renderWithProviders } from "../utils";

const { fetchRecentUploadsMock, fetchRecentLinksMock } = vi.hoisted(() => ({
	fetchRecentUploadsMock: vi.fn(),
	fetchRecentLinksMock: vi.fn(),
}));

vi.mock("@/lib/api/dashboard", () => ({
	RECENT_LIMIT: 5,
	RECENT_UPLOADS_PATH: "/api/uploads?page=1&perPage=5",
	RECENT_LINKS_PATH: "/api/links?page=1&perPage=5&sort=createdAt&order=desc",
	fetchOverview: vi.fn(),
	fetchRecentUploads: fetchRecentUploadsMock,
	fetchRecentLinks: fetchRecentLinksMock,
	fetchConfigView: vi.fn(),
}));

const sampleUpload = {
	id: "abc123XYZ9",
	extension: "png",
	mimeType: "image/png",
	sizeBytes: 52_428_800,
	sizeHuman: "50.0 MB",
	checksumSha256: "a".repeat(64),
	width: null,
	height: null,
	thumbnailUrl: null,
	createdAt: "2026-07-12T09:00:00+00:00",
	url: "https://img.example.com/abc123XYZ9",
	pageUrl: "https://img.example.com/abc123XYZ9",
	rawUrl: "https://img.example.com/raw/abc123XYZ9.png",
	deleteUrl: "https://img.example.com/api/uploads/abc123XYZ9",
};

const sampleLink = {
	slug: "launch",
	targetUrl: "https://example.com/a/very/long/link",
	visits: 4,
	createdAt: "2026-07-13T09:00:00+00:00",
	shortUrl: "https://img.example.com/launch",
};

function resolve(uploads: unknown[], links: unknown[]): void {
	fetchRecentUploadsMock.mockResolvedValue({ items: uploads, total: uploads.length, page: 1, perPage: 5 });
	fetchRecentLinksMock.mockResolvedValue({ items: links, total: links.length, page: 1, perPage: 5 });
}

describe("RecentActivity", () => {
	it("interleaves uploads and short links, newest first", async () => {
		resolve([sampleUpload], [sampleLink]);
		renderWithProviders(<RecentActivity />);

		const rows = within(await screen.findByRole("list")).getAllByRole("listitem");

		expect(rows.map((row) => row.textContent)).toEqual([expect.stringContaining("/launch"), expect.stringContaining("abc123XYZ9.png")]);
	});

	it("sends an upload row to its share page and a link row to the shortener", async () => {
		resolve([sampleUpload], [sampleLink]);
		renderWithProviders(<RecentActivity />);

		expect(await screen.findByRole("link", { name: /abc123XYZ9\.png/ })).toHaveAttribute("href", "/abc123XYZ9");
		expect(screen.getByRole("link", { name: /\/launch/ })).toHaveAttribute("href", "/links");
	});

	it("says what a short link cost and where it points", async () => {
		resolve([], [sampleLink]);
		renderWithProviders(<RecentActivity />);

		expect(await screen.findByText(/4 visits · https:\/\/example\.com/)).toBeInTheDocument();
	});

	it("shows the empty state when neither has anything", async () => {
		resolve([], []);
		renderWithProviders(<RecentActivity />);

		expect(await screen.findByText("Nothing has happened yet.")).toBeInTheDocument();
	});
});

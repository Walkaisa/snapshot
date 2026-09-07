import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadDialog } from "@/components/gallery/upload-dialog";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const copy = en.gallery.upload;

const { uploadFileMock, fetchConfigViewMock, fetchIdAvailabilityMock, toastSuccess, toastError } = vi.hoisted(() => ({
	uploadFileMock: vi.fn(),
	fetchConfigViewMock: vi.fn(),
	fetchIdAvailabilityMock: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@/lib/api/gallery", () => ({
	GALLERY_PAGE_SIZE: 24,
	fetchUploadsPage: vi.fn(),
	fetchUploadStats: vi.fn(),
	deleteUpload: vi.fn(),
	uploadFile: uploadFileMock,
}));

vi.mock("@/lib/api/dashboard", () => ({
	RECENT_UPLOADS_LIMIT: 5,
	fetchOverview: vi.fn(),
	fetchRecentUploads: vi.fn(),
	fetchConfigView: fetchConfigViewMock,
}));

vi.mock("@/lib/api/ids", () => ({ fetchIdAvailability: fetchIdAvailabilityMock }));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const config = { allowedExtensions: null, allowedMimeTypes: null, maxFileSizeBytes: 1024 };

function pick(name: string, type: string, size: number): File {
	const file = new File(["x"], name, { type });

	Object.defineProperty(file, "size", { value: size });

	return file;
}

function renderDialog() {
	renderWithProviders(<UploadDialog open onOpenChange={vi.fn()} baseUrl="https://img.example.com" />);
}

describe("UploadDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchConfigViewMock.mockResolvedValue(config);
		fetchIdAvailabilityMock.mockResolvedValue({ id: "holiday", available: true, occupiedBy: null });
	});

	it("names the file types and size the instance accepts", async () => {
		renderDialog();

		expect(await screen.findByText(/png/)).toBeInTheDocument();
		expect(screen.getByText(/1.0 KB/)).toBeInTheDocument();
	});

	it("uploads the picked file without a slug", async () => {
		uploadFileMock.mockResolvedValue({ id: "abc123" });
		const user = userEvent.setup();
		renderDialog();

		await user.upload(await screen.findByLabelText(copy.dropzone.title), pick("shot.png", "image/png", 512));
		await user.click(screen.getByRole("button", { name: copy.submit }));

		await waitFor(() => expect(uploadFileMock).toHaveBeenCalled());
		expect(uploadFileMock.mock.calls[0]?.[0]).toMatchObject({ slug: null });
	});

	it("sends a custom slug when one was typed", async () => {
		uploadFileMock.mockResolvedValue({ id: "holiday" });
		const user = userEvent.setup();
		renderDialog();

		await user.upload(await screen.findByLabelText(copy.dropzone.title), pick("shot.png", "image/png", 512));
		await user.type(screen.getByLabelText(copy.fields.slug), "holiday");
		await user.click(screen.getByRole("button", { name: copy.submit }));

		await waitFor(() => expect(uploadFileMock.mock.calls[0]?.[0]).toMatchObject({ slug: "holiday" }));
	});

	it("refuses a file that is not a media type", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.upload(await screen.findByLabelText(copy.dropzone.title), pick("notes.txt", "text/plain", 12));

		expect(await screen.findByText(copy.errors.type)).toBeInTheDocument();
		expect(uploadFileMock).not.toHaveBeenCalled();
	});

	it("refuses a file over the configured size limit", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.upload(await screen.findByLabelText(copy.dropzone.title), pick("shot.png", "image/png", 4096));

		expect(await screen.findByText(/1.0 KB limit/)).toBeInTheDocument();
		expect(uploadFileMock).not.toHaveBeenCalled();
	});

	it("refuses a slug the namespace cannot issue", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.upload(await screen.findByLabelText(copy.dropzone.title), pick("shot.png", "image/png", 512));
		await user.type(screen.getByLabelText(copy.fields.slug), "no");
		await user.click(screen.getByRole("button", { name: copy.submit }));

		expect(await screen.findByText(copy.errors.slug)).toBeInTheDocument();
		expect(uploadFileMock).not.toHaveBeenCalled();
	});
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadSettings } from "@/components/settings/upload-settings-form";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const { fetchConfigMock, updateMock, toastSuccess, toastError } = vi.hoisted(() => ({
	fetchConfigMock: vi.fn(),
	updateMock: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@/lib/api/dashboard", () => ({
	fetchConfigView: fetchConfigMock,
	fetchOverview: vi.fn(),
	fetchRecentUploads: vi.fn(),
	RECENT_UPLOADS_LIMIT: 5,
	RECENT_UPLOADS_PATH: "/api/uploads?page=1&perPage=5",
}));

vi.mock("@/lib/api/config", () => ({
	updateConfig: updateMock,
	revealApiKey: vi.fn(),
	rotateApiKey: vi.fn(),
	SHAREX_CONFIG_PATH: "/api/sharex",
}));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const config = {
	apiKey: "••••••••CDEF",
	maxFileSizeBytes: 26_214_400,
	maxTotalStorageBytes: null,
	uploadIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
	uploadIdMinDigits: 2,
	uploadIdMinSymbols: 2,
	uploadIdLength: 8,
	linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "digits"] },
	linkIdMinDigits: 1,
	linkIdMinSymbols: 0,
	linkIdLength: 7,
	allowedExtensions: null,
	allowedMimeTypes: null,
	rateLimitEnabled: true,
	rateLimitRequests: 60,
	rateLimitWindowSeconds: 60,
	embedEnabled: true,
	embedProviderName: "Snapshot",
	embedTitleTemplate: "{filename}",
	embedDescriptionTemplate: "{size_human} | {created_at}",
	embedThemeColor: "#5865F2",
	embedLocale: "en-US",
	timezone: "UTC",
};

function renderSettings() {
	renderWithProviders(<UploadSettings baseUrl="http://localhost:3000" previewFileId="abc123" username="admin" />);
}

describe("UploadSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("adds a normalized extension chip when the restriction is enabled", async () => {
		fetchConfigMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderSettings();

		await user.click(await screen.findByRole("switch", { name: "Restrict extensions" }));
		const input = screen.getByPlaceholderText("Add extension (e.g. .png)");
		await user.type(input, ".PNG{Enter}");

		expect(screen.getByText(".png")).toBeInTheDocument();
	});

	it("rejects an invalid extension", async () => {
		fetchConfigMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderSettings();

		await user.click(await screen.findByRole("switch", { name: "Restrict extensions" }));
		const input = screen.getByPlaceholderText("Add extension (e.g. .png)");
		await user.type(input, "bad!!{Enter}");

		expect(screen.queryByText(".bad!!")).not.toBeInTheDocument();
		expect(input).toHaveAttribute("aria-invalid", "true");
	});

	it("keeps the embed configuration, its toggle and the preview in one collapsible card", async () => {
		fetchConfigMock.mockResolvedValue(config);
		renderSettings();

		const provider = await screen.findByLabelText(en.settings.embed.fields.provider);
		const card = provider.closest('[data-slot="foldable-card"]');

		expect(card).not.toBeNull();
		expect(card?.querySelector('[data-testid="discord-preview"]')).not.toBeNull();
		expect(card?.querySelector('[role="switch"]')).not.toBeNull();
	});

	it("says beside the preview that embeds are off once the toggle is flipped", async () => {
		fetchConfigMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderSettings();

		const toggle = await screen.findByRole("switch", { name: en.settings.embed.fields.enabled });

		expect(screen.getByText(en.settings.embed.previewHint)).toBeInTheDocument();

		await user.click(toggle);

		expect(await screen.findByText(en.settings.embed.disabledHint)).toBeInTheDocument();
	});

	it("re-renders the preview timestamp in the picked locale and timezone", async () => {
		fetchConfigMock.mockResolvedValue(config);
		renderSettings();

		expect(await screen.findByText(/7\/7\/2026/)).toBeInTheDocument();
	});

	it("turns the storage cap into bytes and back off into null", async () => {
		fetchConfigMock.mockResolvedValue(config);
		updateMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderSettings();

		await user.click(await screen.findByRole("switch", { name: "Cap total storage" }));

		const limit = screen.getByLabelText("Storage limit");
		await user.clear(limit);
		await user.type(limit, "2");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
		expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ maxTotalStorageBytes: 2_147_483_648 }), expect.anything());
	});

	it("saves every upload-owned field in one patch", async () => {
		fetchConfigMock.mockResolvedValue(config);
		updateMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderSettings();

		const length = await screen.findByLabelText("Slug length");
		await user.clear(length);
		await user.type(length, "12");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				uploadIdLength: 12,
				maxTotalStorageBytes: null,
				uploadIdMinDigits: 2,
				uploadIdAlphabet: { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] },
				embedProviderName: "Snapshot",
			}),
			expect.anything(),
		);
		expect(updateMock.mock.calls[0]?.[0]).not.toHaveProperty("linkIdLength");
		expect(updateMock.mock.calls[0]?.[0]).not.toHaveProperty("rateLimitRequests");
		expect(toastSuccess).toHaveBeenCalled();
	});
});

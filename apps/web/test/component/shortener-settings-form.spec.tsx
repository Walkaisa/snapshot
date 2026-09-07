import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShortenerSettings } from "@/components/settings/shortener-settings-form";
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
	uploadIdLength: 10,
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
	embedDescriptionTemplate: "{size_human}",
	embedThemeColor: "#5865F2",
	embedLocale: "en-US",
	timezone: "UTC",
};

describe("ShortenerSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("saves only the slug fields, leaving upload ids untouched", async () => {
		fetchConfigMock.mockResolvedValue(config);
		updateMock.mockResolvedValue(config);
		const user = userEvent.setup();
		renderWithProviders(<ShortenerSettings />);

		const length = await screen.findByLabelText("Slug length");
		await user.clear(length);
		await user.type(length, "9");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
		expect(updateMock).toHaveBeenCalledWith(
			{
				linkIdAlphabet: { mode: "charsets", charsets: ["lowercase", "digits"] },
				linkIdMinDigits: 1,
				linkIdMinSymbols: 0,
				linkIdLength: 9,
			},
			expect.anything(),
		);
		expect(toastSuccess).toHaveBeenCalled();
	});

	it("refuses a slug shorter than the guaranteed characters", async () => {
		fetchConfigMock.mockResolvedValue({ ...config, linkIdMinDigits: 5 });
		const user = userEvent.setup();
		renderWithProviders(<ShortenerSettings />);

		const length = await screen.findByLabelText("Slug length");
		await user.clear(length);
		await user.type(length, "4");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(await screen.findByText("Must be at least 5 to fit the guaranteed characters")).toBeInTheDocument();
		expect(updateMock).not.toHaveBeenCalled();
	});
});

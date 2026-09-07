import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdateNotice } from "@/components/layout/update-notice";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const { fetchMetaMock } = vi.hoisted(() => ({ fetchMetaMock: vi.fn() }));

vi.mock("@/lib/api/meta", () => ({ fetchMeta: fetchMetaMock }));

function meta(version: { current: string | null; latest: string | null; updateAvailable: boolean }) {
	return {
		name: "Snapshot",
		author: "Walkaisa",
		repository: "https://github.com/Walkaisa/snapshot",
		version: { ...version, checkedAt: "2026-09-07T10:00:00.000Z" },
	};
}

describe("UpdateNotice", () => {
	beforeEach(() => {
		window.localStorage.clear();
		fetchMetaMock.mockReset();
	});

	it("names both versions and links to the release", async () => {
		fetchMetaMock.mockResolvedValue(meta({ current: "1.0.0", latest: "1.1.0", updateAvailable: true }));
		renderWithProviders(<UpdateNotice />);

		expect(await screen.findByText(en.update.title)).toBeInTheDocument();
		expect(screen.getByText(/1\.1\.0/)).toHaveTextContent(/1\.0\.0/);
		expect(screen.getByRole("link", { name: en.update.release })).toHaveAttribute(
			"href",
			"https://github.com/Walkaisa/snapshot/releases/latest",
		);
	});

	it("stays quiet while the instance is current", async () => {
		fetchMetaMock.mockResolvedValue(meta({ current: "1.1.0", latest: "1.1.0", updateAvailable: false }));
		renderWithProviders(<UpdateNotice />);

		await waitFor(() => expect(fetchMetaMock).toHaveBeenCalled());
		expect(screen.queryByText(en.update.title)).not.toBeInTheDocument();
	});

	it("stays dismissed for the version it was dismissed on", async () => {
		const user = userEvent.setup();
		fetchMetaMock.mockResolvedValue(meta({ current: "1.0.0", latest: "1.1.0", updateAvailable: true }));
		const { unmount } = renderWithProviders(<UpdateNotice />);

		await user.click(await screen.findByRole("button", { name: en.update.dismiss }));
		expect(screen.queryByText(en.update.title)).not.toBeInTheDocument();

		unmount();
		renderWithProviders(<UpdateNotice />);

		await waitFor(() => expect(fetchMetaMock).toHaveBeenCalledTimes(2));
		expect(screen.queryByText(en.update.title)).not.toBeInTheDocument();
	});

	it("speaks up again once a newer release lands", async () => {
		const user = userEvent.setup();
		fetchMetaMock.mockResolvedValue(meta({ current: "1.0.0", latest: "1.1.0", updateAvailable: true }));
		const { unmount } = renderWithProviders(<UpdateNotice />);

		await user.click(await screen.findByRole("button", { name: en.update.dismiss }));
		unmount();

		fetchMetaMock.mockResolvedValue(meta({ current: "1.0.0", latest: "1.2.0", updateAvailable: true }));
		renderWithProviders(<UpdateNotice />);

		expect(await screen.findByText(en.update.title)).toBeInTheDocument();
	});
});

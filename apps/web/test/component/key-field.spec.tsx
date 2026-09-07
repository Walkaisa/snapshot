import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KeyField } from "@/components/settings/key-field";
import { renderWithProviders } from "../utils";

const { revealMock } = vi.hoisted(() => ({ revealMock: vi.fn() }));

vi.mock("@/lib/api/config", () => ({
	revealApiKey: revealMock,
	rotateApiKey: vi.fn(),
	updateConfig: vi.fn(),
	SHAREX_CONFIG_PATH: "/api/sharex",
}));

describe("KeyField", () => {
	it("keeps the key masked until revealed, then fetches the full key once", async () => {
		revealMock.mockResolvedValue({ apiKey: "SUPERSECRETKEY1234567890ABCDEF" });
		const user = userEvent.setup();
		renderWithProviders(<KeyField masked="••••••••CDEF" />);

		expect(screen.getByLabelText("API key")).toHaveValue("••••••••CDEF");
		expect(revealMock).not.toHaveBeenCalled();

		await user.click(screen.getByLabelText("Reveal key"));

		expect(await screen.findByDisplayValue("SUPERSECRETKEY1234567890ABCDEF")).toBeInTheDocument();
		expect(revealMock).toHaveBeenCalledTimes(1);
	});
});

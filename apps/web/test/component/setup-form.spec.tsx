import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SetupForm } from "@/components/auth/setup-form";
import { renderWithProviders } from "../utils";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

describe("SetupForm", () => {
	it("rejects mismatched passwords before calling the API", async () => {
		const user = userEvent.setup();
		renderWithProviders(<SetupForm />);

		await user.type(screen.getByLabelText("Username"), "admin");
		await user.type(screen.getByLabelText("Password"), "a-really-strong-password");
		await user.type(screen.getByLabelText("Confirm password"), "a-different-password-x");
		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
	});

	it("validates the username format", async () => {
		const user = userEvent.setup();
		renderWithProviders(<SetupForm />);

		await user.type(screen.getByLabelText("Username"), "-invalid");
		await user.type(screen.getByLabelText("Password"), "a-really-strong-password");
		await user.type(screen.getByLabelText("Confirm password"), "a-really-strong-password");
		await user.click(screen.getByRole("button", { name: "Create account" }));

		expect(await screen.findByText(/1–64 characters/)).toBeInTheDocument();
	});
});

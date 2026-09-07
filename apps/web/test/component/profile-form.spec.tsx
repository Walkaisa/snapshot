import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "@/components/settings/profile-form";
import { ApiError } from "@/lib/api/types";
import { renderWithProviders } from "../utils";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("@/hooks/use-account", () => ({
	useSession: () => ({
		data: { username: "admin", csrfToken: "token", theme: "system", locale: "system" },
		isPending: false,
		isError: false,
		refetch: vi.fn(),
	}),
	useChangeUsername: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
	mutateAsync.mockReset();
});

describe("ProfileForm", () => {
	it("pre-fills the current username and submits a new one with the password", async () => {
		mutateAsync.mockResolvedValueOnce({ username: "renamed", theme: "system", locale: "system" });
		const user = userEvent.setup();
		renderWithProviders(<ProfileForm />);

		expect(screen.getByRole("button", { name: /Username Change the username/ })).toHaveAttribute("aria-expanded", "true");
		const username = screen.getByLabelText("Username");
		expect(username).toHaveValue("admin");

		await user.clear(username);
		await user.type(username, "renamed");
		await user.type(screen.getByLabelText("Current password"), "current-secret");
		await user.click(screen.getByRole("button", { name: "Update username" }));

		expect(mutateAsync).toHaveBeenCalledWith({ username: "renamed", currentPassword: "current-secret" });
	});

	it("surfaces an incorrect current password from the API", async () => {
		mutateAsync.mockRejectedValueOnce(new ApiError(401, "Current password is incorrect", "unauthorized"));
		const user = userEvent.setup();
		renderWithProviders(<ProfileForm />);

		await user.type(screen.getByLabelText("Current password"), "wrong-secret");
		await user.click(screen.getByRole("button", { name: "Update username" }));

		expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
	});

	it("rejects an invalid username without calling the API", async () => {
		const user = userEvent.setup();
		renderWithProviders(<ProfileForm />);

		const username = screen.getByLabelText("Username");
		await user.clear(username);
		await user.type(username, "-bad");
		await user.type(screen.getByLabelText("Current password"), "current-secret");
		await user.click(screen.getByRole("button", { name: "Update username" }));

		expect(await screen.findByText(/1–64 characters/)).toBeInTheDocument();
		expect(mutateAsync).not.toHaveBeenCalled();
	});
});

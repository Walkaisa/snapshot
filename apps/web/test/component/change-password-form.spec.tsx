import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ApiError } from "@/lib/api/types";
import { renderWithProviders } from "../utils";

const { changeMock } = vi.hoisted(() => ({ changeMock: vi.fn() }));

vi.mock("@/lib/api/auth", () => ({
	changePassword: changeMock,
	fetchSessions: vi.fn(),
	revokeSessions: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn(),
	setupAdmin: vi.fn(),
	fetchAuthState: vi.fn(),
	fetchSession: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function fill(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) {
	await user.type(screen.getByLabelText("Current password"), current);
	await user.type(screen.getByLabelText("New password"), next);
	await user.type(screen.getByLabelText("Confirm new password"), confirm);
	await user.click(screen.getByRole("button", { name: "Update password" }));
}

describe("ChangePasswordForm", () => {
	it("blocks a mismatched confirmation without calling the API", async () => {
		const user = userEvent.setup();
		renderWithProviders(<ChangePasswordForm />);

		await fill(user, "current-secret", "new-password-1234", "different-1234");

		expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
		expect(changeMock).not.toHaveBeenCalled();
	});

	it("surfaces an incorrect current password from the API", async () => {
		changeMock.mockRejectedValueOnce(new ApiError(401, "Current password is incorrect", "unauthorized"));
		const user = userEvent.setup();
		renderWithProviders(<ChangePasswordForm />);

		await fill(user, "wrong-current", "new-password-1234", "new-password-1234");

		expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
	});
});

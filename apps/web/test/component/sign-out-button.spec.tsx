import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { renderWithProviders } from "../utils";

const { replaceMock, signOutMock } = vi.hoisted(() => ({ replaceMock: vi.fn(), signOutMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

vi.mock("@/lib/api/auth", () => ({
	signOut: signOutMock,
	signIn: vi.fn(),
	setupAdmin: vi.fn(),
	changePassword: vi.fn(),
	fetchAuthState: vi.fn(),
	fetchSession: vi.fn(),
	fetchSessions: vi.fn(),
	revokeSessions: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
	replaceMock.mockClear();
	signOutMock.mockReset().mockResolvedValue(undefined);
});

function renderSignOut() {
	return renderWithProviders(
		<SidebarProvider>
			<SignOutButton />
		</SidebarProvider>,
	);
}

describe("SignOutButton", () => {
	it("signs out and returns to the sign-in page", async () => {
		const user = userEvent.setup();
		renderSignOut();

		await user.click(screen.getByRole("button", { name: "Sign out" }));

		await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/sign-in"));
	});

	it("renders as a centered destructive action", () => {
		renderSignOut();

		const button = screen.getByRole("button", { name: "Sign out" });
		expect(button.className).toContain("bg-destructive");
		expect(button.className).toContain("text-destructive");
		expect(button.className).toContain("justify-center");
	});
});

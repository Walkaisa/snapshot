import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionsCard } from "@/components/settings/sessions-card";
import { renderWithProviders } from "../utils";

const { fetchSessionsMock, revokeMock } = vi.hoisted(() => ({
	fetchSessionsMock: vi.fn(),
	revokeMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
	fetchSessions: fetchSessionsMock,
	revokeSessions: revokeMock,
	changePassword: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn(),
	setupAdmin: vi.fn(),
	fetchAuthState: vi.fn(),
	fetchSession: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sessions = {
	sessions: [
		{
			id: "1",
			ip: "1.2.3.4",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
			createdAt: "2026-07-14T10:00:00.000Z",
			lastSeenAt: "2026-07-14T12:00:00.000Z",
			current: true,
		},
		{
			id: "2",
			ip: "5.6.7.8",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
			createdAt: "2026-07-13T10:00:00.000Z",
			lastSeenAt: "2026-07-13T12:00:00.000Z",
			current: false,
		},
	],
};

describe("SessionsCard", () => {
	beforeEach(() => {
		fetchSessionsMock.mockReset();
		revokeMock.mockReset();
	});

	it("lists parsed devices and revokes the others on confirm", async () => {
		fetchSessionsMock.mockResolvedValue(sessions);
		revokeMock.mockResolvedValue({ revoked: 1 });
		const user = userEvent.setup();
		renderWithProviders(<SessionsCard />);

		expect(await screen.findByText("Signed-in devices")).toBeInTheDocument();
		expect(screen.getByText(/There are currently 2 signed-in browser sessions/)).toBeInTheDocument();
		expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
		expect(screen.getByText("Firefox on Linux")).toBeInTheDocument();
		expect(screen.getByText("This device")).toBeInTheDocument();
		expect(screen.getByText(/1\.2\.3\.4/)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Sign out others" }));
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: "Sign out others" }));

		await waitFor(() => expect(revokeMock).toHaveBeenCalledTimes(1));
		expect(revokeMock).toHaveBeenCalledWith({}, expect.anything());
	});

	it("revokes a single session from its row action", async () => {
		fetchSessionsMock.mockResolvedValue(sessions);
		revokeMock.mockResolvedValue({ revoked: 1 });
		const user = userEvent.setup();
		renderWithProviders(<SessionsCard />);

		await user.click(await screen.findByRole("button", { name: "Actions" }));
		await user.click(await screen.findByRole("menuitem", { name: "Sign out session" }));
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: "Sign out session" }));

		await waitFor(() => expect(revokeMock).toHaveBeenCalledTimes(1));
		expect(revokeMock).toHaveBeenCalledWith({ sessionId: "2" }, expect.anything());
	});

	it("disables revoke when only the current session exists", async () => {
		fetchSessionsMock.mockResolvedValue({ sessions: [sessions.sessions[0]] });
		renderWithProviders(<SessionsCard />);

		expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign out others" })).toBeDisabled();
	});
});

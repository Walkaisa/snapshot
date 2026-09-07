import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "@/components/auth/sign-in-form";
import { ApiError } from "@/lib/api/types";
import messages from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const { replaceMock, signInMock, verifyMfaMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	signInMock: vi.fn(),
	verifyMfaMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/auth", () => ({
	signIn: signInMock,
	verifySignInMfa: verifyMfaMock,
	setupAdmin: vi.fn(),
	signOut: vi.fn(),
}));

beforeEach(() => {
	replaceMock.mockClear();
	signInMock.mockReset();
	verifyMfaMock.mockReset();
});

async function signIn(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.type(screen.getByLabelText("Username"), "admin");
	await user.type(screen.getByLabelText("Password"), "a-good-password");
	await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
	it("surfaces a generic error on invalid credentials", async () => {
		signInMock.mockRejectedValueOnce(new ApiError(401, "Invalid credentials", "unauthorized"));
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);

		expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
	});

	it("shows a throttle countdown and disables the button on 429", async () => {
		signInMock.mockRejectedValueOnce(new ApiError(429, "Too many", "rate_limit_exceeded", undefined, 30));
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);

		expect(await screen.findByText(/try again in 30s/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	it("goes straight to the dashboard when no second factor is required", async () => {
		signInMock.mockResolvedValueOnce({ mfaRequired: false, username: "admin", csrfToken: "t", theme: "system", locale: "system" });
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);

		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/overview"));
	});

	it("asks for the authenticator code instead of signing in when the account has two-factor on", async () => {
		signInMock.mockResolvedValueOnce({ mfaRequired: true, csrfToken: "rotated" });
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);

		expect(await screen.findByText("Two-factor authentication")).toBeInTheDocument();
		expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it("completes the sign-in once the code verifies", async () => {
		signInMock.mockResolvedValueOnce({ mfaRequired: true, csrfToken: "rotated" });
		verifyMfaMock.mockResolvedValueOnce({ username: "admin", csrfToken: "t", theme: "system", locale: "system" });
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);
		await user.type(await screen.findByLabelText("Authentication code"), "123456");

		await waitFor(() => expect(verifyMfaMock.mock.calls[0]?.[0]).toEqual({ code: "123456" }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/overview"));
	});

	it("keeps the challenge open and clears the field when the code is wrong", async () => {
		signInMock.mockResolvedValueOnce({ mfaRequired: true, csrfToken: "rotated" });
		verifyMfaMock.mockRejectedValueOnce(new ApiError(401, "That code is not valid", "unauthorized"));
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);
		await user.type(await screen.findByLabelText("Authentication code"), "000000");

		expect(await screen.findByText(/code is not valid/)).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it("offers the recovery code as a way in when the app is unavailable", async () => {
		signInMock.mockResolvedValueOnce({ mfaRequired: true, csrfToken: "rotated" });
		verifyMfaMock.mockResolvedValueOnce({ username: "admin", csrfToken: "t", theme: "system", locale: "system" });
		const user = userEvent.setup();
		renderWithProviders(<SignInForm />);

		await signIn(user);
		await user.click(await screen.findByRole("button", { name: messages.auth.mfa.useRecoveryCode }));
		await user.type(screen.getByLabelText("Recovery code"), "ABCDE-FGHIJ");
		await user.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() => expect(verifyMfaMock.mock.calls[0]?.[0]).toEqual({ code: "ABCDE-FGHIJ" }));
	});
});

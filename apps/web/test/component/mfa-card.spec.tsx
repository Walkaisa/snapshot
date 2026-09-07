import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MfaCard } from "@/components/settings/mfa-card";
import { ApiError } from "@/lib/api/types";
import messages from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const { beginSetupMock, cancelSetupMock, disableMock, enableMock, rotateMock, statusMock } = vi.hoisted(() => ({
	beginSetupMock: vi.fn(),
	cancelSetupMock: vi.fn(),
	disableMock: vi.fn(),
	enableMock: vi.fn(),
	rotateMock: vi.fn(),
	statusMock: vi.fn(),
}));

vi.mock("@/lib/api/mfa", () => ({
	fetchMfaStatus: statusMock,
	beginMfaSetup: beginSetupMock,
	cancelMfaSetup: cancelSetupMock,
	enableMfa: enableMock,
	disableMfa: disableMock,
	regenerateRecoveryCodes: rotateMock,
}));

vi.mock("@/lib/api/auth", () => ({
	fetchSession: vi.fn().mockResolvedValue({ username: "admin", csrfToken: "t", theme: "system", locale: "system" }),
	signIn: vi.fn(),
	setupAdmin: vi.fn(),
	signOut: vi.fn(),
	verifySignInMfa: vi.fn(),
	changePassword: vi.fn(),
	fetchSessions: vi.fn(),
	revokeSessions: vi.fn(),
	fetchAuthState: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ENROLLMENT = {
	secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
	otpauthUri: "otpauth://totp/Snapshot:admin?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Snapshot",
	issuer: "Snapshot",
	account: "admin",
	digits: 6,
	period: 30,
};

const CODES = ["ABCDE-FGHIJ", "KLMNP-QRSTU"];

const mfa = messages.settings.mfa;

beforeEach(() => {
	statusMock.mockReset();
	beginSetupMock.mockReset();
	cancelSetupMock.mockReset().mockResolvedValue(undefined);
	enableMock.mockReset();
	disableMock.mockReset();
	rotateMock.mockReset();
});

function disabled() {
	statusMock.mockResolvedValue({ enabled: false, pendingEnrollment: false, label: null, enabledAt: null, recoveryCodesRemaining: 0 });
}

function enabled(label = "Bitwarden") {
	statusMock.mockResolvedValue({
		enabled: true,
		pendingEnrollment: false,
		label,
		enabledAt: "2026-03-14T09:05:00.000Z",
		recoveryCodesRemaining: 7,
	});
}

describe("MfaCard", () => {
	it("names the enrolled app and when it was added, in one panel", async () => {
		enabled();
		renderWithProviders(<MfaCard />);

		expect(await screen.findByText("Bitwarden")).toBeInTheDocument();
		expect(screen.getByText("Added Mar 14, 2026, 9:05 AM")).toBeInTheDocument();
		expect(screen.getByText(mfa.status.enabled)).toBeInTheDocument();
	});

	it("reads as the same panel when two-factor is off", async () => {
		disabled();
		renderWithProviders(<MfaCard />);

		expect(await screen.findByText(mfa.status.title)).toBeInTheDocument();
		expect(screen.getByText(mfa.status.disabled)).toBeInTheDocument();
		expect(screen.getByText(mfa.status.hint)).toBeInTheDocument();
		expect(screen.queryByText(/recovery codes left/)).not.toBeInTheDocument();
	});

	it("falls back to a generic name when none was stored", async () => {
		enabled();
		statusMock.mockResolvedValue({
			enabled: true,
			pendingEnrollment: false,
			label: null,
			enabledAt: "2026-03-14T09:05:00.000Z",
			recoveryCodesRemaining: 7,
		});
		renderWithProviders(<MfaCard />);

		expect(await screen.findByText(mfa.defaultLabel)).toBeInTheDocument();
	});

	it("puts both password-gated actions on the card, not behind a menu", async () => {
		enabled();
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.rotateCodes }));
		expect(await screen.findByLabelText(mfa.passwordLabel)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: mfa.actions.cancel }));
		await user.click(screen.getByRole("button", { name: mfa.actions.disable }));

		expect(await screen.findByLabelText(mfa.passwordLabel)).toBeInTheDocument();
		expect(screen.getByLabelText(mfa.disableDialog.codeLabel)).toBeInTheDocument();
	});

	it("requires an existing second factor before replacing recovery codes", async () => {
		enabled();
		rotateMock.mockResolvedValue({ codes: CODES });
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.rotateCodes }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password");
		await user.type(screen.getByLabelText(mfa.rotateDialog.codeLabel), "123456");
		await user.click(screen.getByRole("button", { name: mfa.actions.rotateCodes }));

		await waitFor(() => expect(rotateMock.mock.calls[0]?.[0]).toEqual({ currentPassword: "a-good-password", code: "123456" }));
	});

	it.each(["123456", "ABCDE-FG234"])("turns off two-factor with the password and code %s", async (code) => {
		enabled();
		disableMock.mockResolvedValue(undefined);
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.disable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password");
		expect(screen.getByRole("button", { name: mfa.actions.disable })).toBeDisabled();
		await user.type(screen.getByLabelText(mfa.disableDialog.codeLabel), code);
		await user.click(screen.getByRole("button", { name: mfa.actions.disable }));

		await waitFor(() => expect(disableMock.mock.calls[0]?.[0]).toEqual({ currentPassword: "a-good-password", code }));
	});

	it("shows how many recovery codes are left", async () => {
		enabled();
		renderWithProviders(<MfaCard />);

		expect(await screen.findByText(/7 recovery codes left/)).toBeInTheDocument();
	});

	it("submits the password step on Enter", async () => {
		disabled();
		beginSetupMock.mockResolvedValue(ENROLLMENT);
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.enable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password{Enter}");

		await waitFor(() => expect(beginSetupMock.mock.calls[0]?.[0]).toEqual({ currentPassword: "a-good-password" }));
	});

	it("shows the secret and a prefilled name once enrolment starts", async () => {
		disabled();
		beginSetupMock.mockResolvedValue(ENROLLMENT);
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.enable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password{Enter}");

		const secret = (await screen.findByLabelText(mfa.enroll.secretLabel)) as HTMLInputElement;
		expect(secret.value).toBe("GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ");
		expect((screen.getByLabelText(mfa.enroll.labelLabel) as HTMLInputElement).value).toBe(mfa.enroll.labelDefault);
		expect(screen.getByRole("img", { name: mfa.enroll.qrLabel })).toBeInTheDocument();
	});

	it("sends the name along with the confirmation code", async () => {
		disabled();
		beginSetupMock.mockResolvedValue(ENROLLMENT);
		enableMock.mockResolvedValue({ codes: CODES });
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.enable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password{Enter}");

		const name = await screen.findByLabelText(mfa.enroll.labelLabel);
		await user.clear(name);
		await user.type(name, "Bitwarden");
		await user.type(screen.getByLabelText(mfa.enroll.codeLabel), "123456");

		expect(enableMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: mfa.enroll.confirm }));

		await waitFor(() => expect(enableMock.mock.calls[0]?.[0]).toEqual({ code: "123456", label: "Bitwarden" }));
		expect(await screen.findByText(CODES[0] as string)).toBeInTheDocument();
	});

	it("waits for the button, so the name can still be changed after the last digit", async () => {
		disabled();
		beginSetupMock.mockResolvedValue(ENROLLMENT);
		enableMock.mockResolvedValue({ codes: CODES });
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.enable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password{Enter}");
		await user.type(await screen.findByLabelText(mfa.enroll.codeLabel), "123456");

		const name = screen.getByLabelText(mfa.enroll.labelLabel);
		await user.clear(name);
		await user.type(name, "Aegis");
		await user.click(screen.getByRole("button", { name: mfa.enroll.confirm }));

		await waitFor(() => expect(enableMock.mock.calls[0]?.[0]).toEqual({ code: "123456", label: "Aegis" }));
	});

	it("surfaces a rejected code without closing the dialog", async () => {
		disabled();
		beginSetupMock.mockResolvedValue(ENROLLMENT);
		enableMock.mockRejectedValue(new ApiError(401, "That code is not valid", "unauthorized"));
		const user = userEvent.setup();
		renderWithProviders(<MfaCard />);

		await user.click(await screen.findByRole("button", { name: mfa.actions.enable }));
		await user.type(await screen.findByLabelText(mfa.passwordLabel), "a-good-password{Enter}");
		await user.type(await screen.findByLabelText(mfa.enroll.codeLabel), "000000");
		await user.click(screen.getByRole("button", { name: mfa.enroll.confirm }));

		expect(await screen.findByText(/code is not valid/)).toBeInTheDocument();
		expect(screen.getByLabelText(mfa.enroll.labelLabel)).toBeInTheDocument();
	});
});

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreferencesSync } from "@/components/layout/preferences-sync";

const { changeLocale, setTheme, state } = vi.hoisted(() => ({
	changeLocale: vi.fn(),
	setTheme: vi.fn(),
	state: { appliedTheme: "system", locale: "system", sessionTheme: "system" },
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: state.appliedTheme, setTheme }),
}));

vi.mock("@/hooks/use-account", () => ({
	useSession: () => ({ data: { locale: state.locale, theme: state.sessionTheme } }),
}));

vi.mock("@/i18n/actions", () => ({ changeLocale }));

beforeEach(() => {
	changeLocale.mockClear();
	setTheme.mockClear();
	state.appliedTheme = "system";
	state.locale = "system";
	state.sessionTheme = "system";
});

describe("PreferencesSync", () => {
	it("does not apply a locally selected theme a second time after persistence", () => {
		const { rerender } = render(<PreferencesSync localeChoice="system" />);
		expect(setTheme).not.toHaveBeenCalled();

		state.appliedTheme = "dark";
		rerender(<PreferencesSync localeChoice="system" />);
		expect(setTheme).not.toHaveBeenCalled();

		state.sessionTheme = "dark";
		rerender(<PreferencesSync localeChoice="system" />);
		expect(setTheme).not.toHaveBeenCalled();
	});

	it("reconciles a different stored theme exactly once", () => {
		state.sessionTheme = "dark";
		const { rerender } = render(<PreferencesSync localeChoice="system" />);

		expect(setTheme).toHaveBeenCalledOnce();
		expect(setTheme).toHaveBeenCalledWith("dark");

		state.appliedTheme = "dark";
		rerender(<PreferencesSync localeChoice="system" />);
		expect(setTheme).toHaveBeenCalledOnce();
	});
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageCard } from "@/components/settings/language-card";
import { ThemeCard } from "@/components/settings/theme-card";
import { renderWithProviders } from "../utils";

const { mutateAsync, setTheme, state } = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	setTheme: vi.fn(),
	state: { theme: "system", locale: "system" },
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: state.theme, setTheme, forcedTheme: undefined }),
}));

vi.mock("@/hooks/use-account", () => ({
	useSession: () => ({ data: { username: "admin", csrfToken: "token", theme: state.theme, locale: state.locale } }),
	useUpdatePreferences: () => ({ mutateAsync, isPending: false }),
}));

beforeEach(() => {
	mutateAsync.mockClear();
	setTheme.mockClear();
	state.theme = "system";
	state.locale = "system";
});

describe("ThemeCard", () => {
	it("offers the three themes as one radio group with the active one checked", async () => {
		renderWithProviders(<ThemeCard />);

		const group = await screen.findByRole("radiogroup", { name: "Theme" });
		expect(within(group).getAllByRole("radio")).toHaveLength(3);
		expect(within(group).getByRole("radio", { name: "System (default)" })).toBeChecked();
		expect(within(group).getByRole("radio", { name: "Dark" })).not.toBeChecked();
	});

	it("applies the theme instantly and persists it on selection", async () => {
		const user = userEvent.setup();
		renderWithProviders(<ThemeCard />);

		await user.click(await screen.findByRole("radio", { name: "Dark" }));

		expect(setTheme).toHaveBeenCalledWith("dark");
		expect(mutateAsync).toHaveBeenCalledWith({ theme: "dark" });
	});

	it("restores the previous theme when persistence fails", async () => {
		mutateAsync.mockRejectedValueOnce(new Error("save failed"));
		const user = userEvent.setup();
		renderWithProviders(<ThemeCard />);

		await user.click(await screen.findByRole("radio", { name: "Dark" }));

		await waitFor(() => expect(setTheme).toHaveBeenLastCalledWith("system"));
		expect(setTheme).toHaveBeenNthCalledWith(1, "dark");
	});
});

describe("LanguageCard", () => {
	it("offers System as the default alongside the explicit locales", async () => {
		const user = userEvent.setup();
		renderWithProviders(<LanguageCard />);

		await user.click(screen.getByRole("combobox", { name: "Language" }));

		expect(await screen.findByRole("option", { name: "System (default)" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
	});

	it("marks the active locale and persists the other one", async () => {
		state.locale = "en";
		const user = userEvent.setup();
		renderWithProviders(<LanguageCard />);

		expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("English");

		await user.click(screen.getByRole("combobox", { name: "Language" }));
		await user.click(await screen.findByRole("option", { name: "Deutsch" }));

		expect(mutateAsync).toHaveBeenCalledWith({ locale: "de" });
	});

	it("does not persist when the active locale is picked again", async () => {
		state.locale = "en";
		const user = userEvent.setup();
		renderWithProviders(<LanguageCard />);

		await user.click(screen.getByRole("combobox", { name: "Language" }));
		await user.click(await screen.findByRole("option", { name: "English" }));

		expect(mutateAsync).not.toHaveBeenCalled();
	});
});

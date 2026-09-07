import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiKeyCard } from "@/components/settings/api-key-card";
import { ShareXCard } from "@/components/settings/sharex-card";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const apiKey = en.settings.apiKey;
const sharex = en.settings.sharex;

vi.mock("@/hooks/use-dashboard", () => ({
	useConfigView: () => ({
		data: { apiKey: "••••••••CDEF" },
		isPending: false,
		isError: false,
		refetch: vi.fn(),
	}),
}));

vi.mock("@/hooks/use-config", () => ({
	useApiKeyReveal: () => ({ data: undefined, refetch: vi.fn(), isFetching: false }),
	useRotateApiKey: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("foldable settings cards", () => {
	it("renders the API key card with an expanded foldable header", () => {
		renderWithProviders(<ApiKeyCard />);

		expect(screen.getByRole("button", { name: `${apiKey.label} ${apiKey.description}` })).toHaveAttribute("aria-expanded", "true");
	});

	it("renders the ShareX card with an expanded foldable header", () => {
		renderWithProviders(<ShareXCard />);

		expect(screen.getByRole("button", { name: `${sharex.status} ${sharex.statusHint}` })).toHaveAttribute("aria-expanded", "true");
	});
});

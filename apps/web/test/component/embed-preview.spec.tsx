import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmbedPreview } from "@/components/settings/embed-preview";
import { renderWithProviders } from "../utils";

describe("EmbedPreview", () => {
	it("renders a Discord-style message with the filled embed", () => {
		renderWithProviders(
			<EmbedPreview
				baseUrl="https://snapshot.example"
				providerName="Snapshot"
				previewFileId="aB3xK9mN2p"
				themeColor="#5865F2"
				title="{filename} on {provider}"
				description="{size_human} | {created_at}"
				embedLocale="de_DE"
				timezone="Europe/Berlin"
				username="Walkaisa"
			/>,
		);

		expect(screen.getByTestId("discord-preview")).toBeInTheDocument();
		expect(screen.getByText("Walkaisa")).toBeInTheDocument();
		expect(screen.getByAltText("Walkaisa avatar")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "https://snapshot.example/aB3xK9mN2p" })).toHaveAttribute(
			"href",
			"https://snapshot.example/aB3xK9mN2p",
		);
		expect(screen.getByRole("link", { name: "aB3xK9mN2p.png on Snapshot" })).toHaveAttribute(
			"href",
			"https://snapshot.example/aB3xK9mN2p",
		);
		expect(screen.getByText("2037 KB | 7.7.2026, 18:58:59")).toBeInTheDocument();
		expect(screen.getByText("Snapshot", { selector: "p" })).toBeInTheDocument();
		expect(screen.getByLabelText("Snapshot placeholder preview")).toBeInTheDocument();
		expect(screen.getByTestId("discord-embed-card")).toHaveStyle({ borderLeftColor: "#5865F2" });
	});

	it("renders the sample timestamp in the configured locale and timezone", () => {
		renderWithProviders(
			<EmbedPreview
				baseUrl="https://snapshot.example"
				providerName="Snapshot"
				previewFileId="aB3xK9mN2p"
				themeColor="#5865F2"
				title="{filename}"
				description="{created_at}"
				embedLocale="en_US"
				timezone="UTC"
				username="Walkaisa"
			/>,
		);

		expect(screen.getByText(/7\/7\/2026/)).toBeInTheDocument();
		expect(screen.getByText(/4:58:59/)).toBeInTheDocument();
	});

	it("falls back rather than throwing on a locale the browser cannot build", () => {
		renderWithProviders(
			<EmbedPreview
				baseUrl="https://snapshot.example"
				providerName="Snapshot"
				previewFileId="aB3xK9mN2p"
				themeColor="#5865F2"
				title="{filename}"
				description="{created_at}"
				embedLocale="en_US"
				timezone="Not/AZone"
				username="Walkaisa"
			/>,
		);

		expect(screen.getByText(/7\/7\/2026/)).toBeInTheDocument();
	});
});

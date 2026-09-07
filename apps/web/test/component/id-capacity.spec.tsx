import { ID_CHARSETS } from "@snapshot/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { IdCapacity } from "@/components/settings/id-capacity";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const copy = en.settings.ids.capacity;

const ALPHANUMERIC = `${ID_CHARSETS.lowercase}${ID_CHARSETS.uppercase}${ID_CHARSETS.digits}`;
const NONE = { digits: 0, symbols: 0 };

describe("IdCapacity", () => {
	it("leads with the keyspace and the headroom before a repeat", () => {
		renderWithProviders(<IdCapacity alphabet={ALPHANUMERIC} length={10} minimums={NONE} />);

		expect(screen.getByText("8.4 × 10¹⁷")).toBeInTheDocument();
		expect(screen.getByText("916.1M")).toBeInTheDocument();
		expect(screen.getByText("drawn from 62 characters")).toBeInTheDocument();
		expect(screen.getByText("59 bit")).toBeInTheDocument();
	});

	it("shows an example built from the configured alphabet", () => {
		renderWithProviders(<IdCapacity alphabet="abc012" length={12} minimums={NONE} />);

		expect(screen.getByText(/^[abc012]{12}$/, { selector: "[aria-live]" })).toBeInTheDocument();
	});

	it("draws a different example on request", async () => {
		const user = userEvent.setup();
		renderWithProviders(<IdCapacity alphabet={ALPHANUMERIC} length={24} minimums={NONE} />);

		const before = screen.getByText(/^[A-Za-z0-9]{24}$/, { selector: "[aria-live]" }).textContent;
		await user.click(screen.getByRole("button", { name: copy.reroll }));

		expect(screen.getByText(/^[A-Za-z0-9]{24}$/, { selector: "[aria-live]" }).textContent).not.toBe(before);
	});

	it("honours the guaranteed characters in the example", () => {
		renderWithProviders(
			<IdCapacity alphabet={`${ALPHANUMERIC}${ID_CHARSETS.symbols}`} length={12} minimums={{ digits: 2, symbols: 1 }} />,
		);

		const example = screen.getByText(/^[A-Za-z0-9_-]{12}$/, { selector: "[aria-live]" }).textContent ?? "";

		expect([...example].filter((character) => ID_CHARSETS.digits.includes(character)).length).toBeGreaterThanOrEqual(2);
		expect([...example].filter((character) => ID_CHARSETS.symbols.includes(character)).length).toBeGreaterThanOrEqual(1);
	});

	it("grows the headroom as the length grows", () => {
		const { unmount } = renderWithProviders(<IdCapacity alphabet={ALPHANUMERIC} length={4} minimums={NONE} />);
		expect(screen.getByText("3.8K")).toBeInTheDocument();
		unmount();

		renderWithProviders(<IdCapacity alphabet={ALPHANUMERIC} length={20} minimums={NONE} />);
		expect(screen.getByText("8.4 × 10¹⁷")).toBeInTheDocument();
	});

	it("says so when the shape cannot produce an id at all", () => {
		renderWithProviders(<IdCapacity alphabet={ALPHANUMERIC} length={3} minimums={{ digits: 4, symbols: 0 }} />);

		expect(screen.getByText(copy.impossible)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.reroll })).toBeDisabled();
	});
});

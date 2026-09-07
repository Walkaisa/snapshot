import { ID_CHARSETS, type IdAlphabet } from "@snapshot/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
	fromIdAlphabetValue,
	IdAlphabetField,
	type IdAlphabetValue,
	resolveValueAlphabet,
	toIdAlphabetValue,
} from "@/components/settings/id-alphabet-field";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const copy = en.settings.ids;

function Harness({ initial, onValue }: { initial: IdAlphabetValue; onValue?: (value: IdAlphabetValue) => void }) {
	const [value, setValue] = useState(initial);

	return (
		<IdAlphabetField
			id="alphabet"
			value={value}
			onChange={(next) => {
				setValue(next);
				onValue?.(next);
			}}
		/>
	);
}

const charsetsValue: IdAlphabetValue = { mode: "charsets", charsets: ["lowercase", "digits"], characters: "" };

describe("id alphabet value mapping", () => {
	it("round-trips a charset selection", () => {
		const alphabet: IdAlphabet = { mode: "charsets", charsets: ["lowercase", "digits"] };

		expect(fromIdAlphabetValue(toIdAlphabetValue(alphabet))).toEqual(alphabet);
	});

	it("round-trips custom characters", () => {
		const alphabet: IdAlphabet = { mode: "custom", characters: "abcdefgh" };

		expect(fromIdAlphabetValue(toIdAlphabetValue(alphabet))).toEqual(alphabet);
	});

	it("keeps the other mode's draft while the form is open", () => {
		const value: IdAlphabetValue = { mode: "custom", charsets: ["lowercase"], characters: "abcdefgh" };

		expect(resolveValueAlphabet(value)).toBe("abcdefgh");
		expect(resolveValueAlphabet({ ...value, mode: "charsets" })).toBe(ID_CHARSETS.lowercase);
	});
});

describe("IdAlphabetField", () => {
	it("ticks the character sets the value carries", () => {
		renderWithProviders(<Harness initial={charsetsValue} />);

		expect(screen.getByRole("checkbox", { name: /Lowercase/ })).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("checkbox", { name: /Digits/ })).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("checkbox", { name: /Uppercase/ })).toHaveAttribute("aria-checked", "false");
	});

	it("adds a character set when its checkbox is ticked", async () => {
		const seen: IdAlphabetValue[] = [];
		const user = userEvent.setup();
		renderWithProviders(<Harness initial={charsetsValue} onValue={(value) => seen.push(value)} />);

		await user.click(screen.getByRole("checkbox", { name: /Uppercase/ }));

		expect(seen.at(-1)?.charsets).toEqual(["lowercase", "uppercase", "digits"]);
	});

	it("removes a character set when its checkbox is unticked", async () => {
		const seen: IdAlphabetValue[] = [];
		const user = userEvent.setup();
		renderWithProviders(<Harness initial={charsetsValue} onValue={(value) => seen.push(value)} />);

		await user.click(screen.getByRole("checkbox", { name: /Digits/ }));

		expect(seen.at(-1)?.charsets).toEqual(["lowercase"]);
	});

	it("swaps the checkboxes for a character input in custom mode", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Harness initial={charsetsValue} />);

		await user.click(screen.getByRole("radio", { name: new RegExp(copy.alphabet.mode.custom.title) }));

		expect(screen.queryByRole("checkbox", { name: /Lowercase/ })).not.toBeInTheDocument();
		expect(screen.getByLabelText(copy.alphabet.custom.label)).toBeInTheDocument();
	});

	it("keeps the typed characters in custom mode", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Harness initial={{ mode: "custom", charsets: [], characters: "" }} />);

		await user.type(screen.getByLabelText(copy.alphabet.custom.label), "aabbccdd");

		expect(screen.getByLabelText(copy.alphabet.custom.label)).toHaveValue("aabbccdd");
	});
});

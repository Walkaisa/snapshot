import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CodeInput } from "@/components/auth/code-input";

function Harness({
	initial = "",
	onChange,
	...rest
}: { initial?: string; onChange: (value: string) => void } & Omit<Parameters<typeof CodeInput>[0], "id" | "value" | "onChange">) {
	const [value, setValue] = useState(initial);

	return (
		<>
			<label htmlFor="code">Code</label>
			<CodeInput
				id="code"
				value={value}
				onChange={(next) => {
					onChange(next);
					setValue(next);
				}}
				{...rest}
			/>
		</>
	);
}

function renderInput(props: Partial<Parameters<typeof Harness>[0]> = {}) {
	const onChange = props.onChange ?? vi.fn();
	const { container } = render(<Harness {...props} onChange={onChange} />);

	return {
		input: screen.getByLabelText("Code") as HTMLInputElement,
		slots: container.querySelectorAll("[data-slot='input-otp-slot']"),
		onChange,
	};
}

function fillLikePasswordManager(input: HTMLInputElement, code: string): void {
	input.value = code;
	input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("CodeInput", () => {
	it("is one input behind six slots", () => {
		const { input, slots } = renderInput();

		expect(input.tagName).toBe("INPUT");
		expect(input.autocomplete).toBe("one-time-code");
		expect(input.inputMode).toBe("numeric");
		expect(slots).toHaveLength(6);
	});

	it("paints each digit into its own slot", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderInput();

		await user.type(input, "123");

		expect([...slots].map((slot) => slot.textContent)).toEqual(["1", "2", "3", "", "", ""]);
	});

	it("keeps only digits", async () => {
		const onChange = vi.fn();
		const user = userEvent.setup();
		const { input } = renderInput({ onChange });

		await user.type(input, "1a2-b3");

		expect(onChange.mock.calls.map(([value]) => value)).toEqual(["1", "12", "123"]);
		expect(input.value).toBe("123");
	});

	it("stops at the code length, so a stray keystroke cannot extend it", async () => {
		const user = userEvent.setup();
		const { input } = renderInput({ initial: "123456" });

		await user.type(input, "7");

		expect(input.value).toHaveLength(6);
	});

	it("reports completion once the last digit lands", async () => {
		const onComplete = vi.fn();
		const user = userEvent.setup();
		const { input } = renderInput({ initial: "12345", onComplete });

		await user.type(input, "6");

		expect(onComplete).toHaveBeenCalledWith("123456");
	});

	it("reports completion for a pasted code, spaces and all", async () => {
		const onComplete = vi.fn();
		const user = userEvent.setup();
		const { input } = renderInput({ onComplete });

		await user.click(input);
		await user.paste("123 456");

		expect(onComplete).toHaveBeenCalledWith("123456");
		expect(input.value).toBe("123456");
	});

	it("does not report completion while the code is still short", async () => {
		const onComplete = vi.fn();
		const user = userEvent.setup();
		const { input } = renderInput({ onComplete });

		await user.type(input, "123");

		expect(onComplete).not.toHaveBeenCalled();
	});

	it("marks itself invalid for assistive tech, and every slot for the eye", () => {
		const { input, slots } = renderInput({ invalid: true, describedBy: "code-error" });

		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("aria-describedby", "code-error");
		expect([...slots].every((slot) => slot.getAttribute("aria-invalid") === "true")).toBe(true);
	});

	it("adopts a value a password manager wrote straight onto the input", async () => {
		const onChange = vi.fn();
		const onComplete = vi.fn();
		const { input } = renderInput({ onChange, onComplete });

		fillLikePasswordManager(input, "123456");

		await waitFor(() => expect(onChange).toHaveBeenCalledWith("123456"));
		expect(onComplete).toHaveBeenCalledExactlyOnceWith("123456");
		expect(screen.getByLabelText("Code")).toHaveValue("123456");
	});

	it("strips whatever a password manager pads the code with", async () => {
		const onChange = vi.fn();
		const { input } = renderInput({ onChange });

		fillLikePasswordManager(input, "123 456");

		await waitFor(() => expect(onChange).toHaveBeenCalledWith("123456"));
	});

	it("does not fire completion twice when the code is typed by hand", async () => {
		const onComplete = vi.fn();
		const user = userEvent.setup();
		const { input } = renderInput({ onComplete });

		await user.type(input, "123456");

		expect(onComplete).toHaveBeenCalledExactlyOnceWith("123456");
	});
});

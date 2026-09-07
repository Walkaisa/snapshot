"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const CODE_LENGTH = 6;

const SIZES = {
	default: "h-9",
	lg: "h-12 text-xl",
};

function digitsOnly(value: string): string {
	return value.replaceAll(/\D/g, "").slice(0, CODE_LENGTH);
}

export function CodeInput({
	id,
	value,
	onChange,
	onComplete,
	disabled = false,
	invalid = false,
	describedBy,
	autoFocus = false,
	size = "default",
	className,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	disabled?: boolean;
	invalid?: boolean;
	describedBy?: string;
	autoFocus?: boolean;
	size?: keyof typeof SIZES;
	className?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const completed = useRef(false);
	const latest = useRef({ value, onChange });
	latest.current = { value, onChange };

	useEffect(() => {
		const input = inputRef.current;

		if (input === null) {
			return;
		}

		function adoptExternalFill(): void {
			queueMicrotask(() => {
				const filled = digitsOnly(input?.value ?? "");

				if (filled !== latest.current.value) {
					latest.current.onChange(filled);
				}
			});
		}

		input.addEventListener("input", adoptExternalFill);
		input.addEventListener("change", adoptExternalFill);

		return () => {
			input.removeEventListener("input", adoptExternalFill);
			input.removeEventListener("change", adoptExternalFill);
		};
	}, []);

	useEffect(() => {
		if (value.length < CODE_LENGTH) {
			completed.current = false;
			return;
		}

		if (!completed.current) {
			completed.current = true;
			onComplete?.(value);
		}
	}, [value, onComplete]);

	return (
		<Input
			ref={inputRef}
			id={id}
			name="one-time-code"
			value={value}
			onChange={(event) => {
				const next = digitsOnly(event.target.value);

				if (next !== value) {
					onChange(next);
				}
			}}
			disabled={disabled}
			autoFocus={autoFocus}
			autoComplete="one-time-code"
			autoCorrect="off"
			spellCheck={false}
			inputMode="numeric"
			aria-invalid={invalid}
			aria-describedby={describedBy}
			className={cn("text-center font-mono tabular-nums tracking-widest", SIZES[size], className)}
		/>
	);
}

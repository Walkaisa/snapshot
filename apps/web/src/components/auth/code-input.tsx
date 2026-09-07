"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useEffect, useRef } from "react";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export const CODE_LENGTH = 6;

const SLOT_HEIGHT = {
	default: "h-9",
	lg: "h-12 text-xl",
};

const SLOTS = Array.from({ length: CODE_LENGTH }, (_, index) => index);

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
	size?: keyof typeof SLOT_HEIGHT;
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
				const filled = (input?.value ?? "").replaceAll(/\D/g, "").slice(0, CODE_LENGTH);

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
		<InputOTP
			ref={inputRef}
			id={id}
			name="one-time-code"
			maxLength={CODE_LENGTH}
			value={value}
			onChange={onChange}
			disabled={disabled}
			autoFocus={autoFocus}
			autoComplete="one-time-code"
			pattern={REGEXP_ONLY_DIGITS}
			pasteTransformer={(pasted) => pasted.replaceAll(/\D/g, "")}
			pushPasswordManagerStrategy="none"
			aria-invalid={invalid}
			aria-describedby={describedBy}
			containerClassName={cn("w-full", className)}
		>
			<InputOTPGroup className="w-full">
				{SLOTS.map((index) => (
					<InputOTPSlot
						key={index}
						index={index}
						aria-invalid={invalid}
						className={cn("min-w-0 flex-1 font-mono tabular-nums", SLOT_HEIGHT[size])}
					/>
				))}
			</InputOTPGroup>
		</InputOTP>
	);
}

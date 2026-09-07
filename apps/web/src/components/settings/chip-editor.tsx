"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChipEditorProps {
	id?: string;
	value: string[];
	onChange: (value: string[]) => void;
	normalize?: (item: string) => string;
	validate?: (item: string) => boolean;
	placeholder?: string;
	emptyLabel: string;
	disabled?: boolean;
	invalid?: boolean;
	describedBy?: string;
}

export function ChipEditor({
	id,
	value,
	onChange,
	normalize,
	validate,
	placeholder,
	emptyLabel,
	disabled = false,
	invalid: invalidProp = false,
	describedBy,
}: ChipEditorProps) {
	const t = useTranslations("common");
	const [draft, setDraft] = useState("");
	const [invalid, setInvalid] = useState(false);

	function commit(): void {
		const item = (normalize ?? ((raw) => raw.trim()))(draft);

		if (item.length === 0) {
			setDraft("");
			return;
		}

		if (validate && !validate(item)) {
			setInvalid(true);
			return;
		}

		if (!value.includes(item)) {
			onChange([...value, item]);
		}

		setDraft("");
		setInvalid(false);
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			commit();
		}
	}

	return (
		<div className={cn("grid gap-2", disabled && "pointer-events-none opacity-50")}>
			{value.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{value.map((item) => (
						<Badge key={item} variant="secondary">
							{item}
							<button
								type="button"
								data-icon="inline-end"
								onClick={() => onChange(value.filter((entry) => entry !== item))}
								aria-label={`${t("remove")} ${item}`}
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">{emptyLabel}</p>
			)}
			<Input
				id={id}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
					setInvalid(false);
				}}
				onKeyDown={onKeyDown}
				onBlur={commit}
				placeholder={placeholder}
				disabled={disabled}
				aria-invalid={invalid || invalidProp}
				aria-describedby={describedBy}
			/>
		</div>
	);
}

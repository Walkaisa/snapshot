"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface PickerOption<TValue extends string> {
	value: TValue;
	label: string;
	icon?: LucideIcon;
	isDefault?: boolean;
}

export function OptionPicker<TValue extends string>({
	className,
	disabled = false,
	label,
	name,
	onChange,
	options,
	value,
}: {
	className?: string;
	disabled?: boolean;
	label: string;
	name: string;
	onChange: (value: TValue) => void;
	options: PickerOption<TValue>[];
	value: TValue;
}) {
	const t = useTranslations("common");

	return (
		<RadioGroup
			aria-label={label}
			disabled={disabled}
			value={value}
			onValueChange={(next) => onChange(next as TValue)}
			className={cn(className)}
		>
			{options.map((option) => {
				const Icon = option.icon;
				const id = `${name}-${option.value}`;

				return (
					<div key={option.value} className="flex items-center gap-3">
						<RadioGroupItem value={option.value} id={id} />
						<Label htmlFor={id}>
							{Icon ? <Icon className="size-4" /> : null}
							{option.label}
							{option.isDefault ? " " : null}
							{option.isDefault ? <span className="text-muted-foreground">({t("default")})</span> : null}
						</Label>
					</div>
				);
			})}
		</RadioGroup>
	);
}

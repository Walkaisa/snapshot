"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
	value: string;
	label: string;
	keywords?: string[];
	icon?: ReactNode;
	isDefault?: boolean;
}

function OptionLabel({ option }: { option: SearchSelectOption }) {
	const t = useTranslations("common");

	return (
		<>
			{option.label}
			{option.isDefault ? " " : null}
			{option.isDefault ? <span className="text-muted-foreground">({t("default")})</span> : null}
		</>
	);
}

export function SearchSelect({
	ariaLabel,
	describedBy,
	disabled = false,
	emptyMessage,
	id,
	invalid = false,
	onChange,
	options,
	placeholder,
	searchPlaceholder,
	value,
}: {
	ariaLabel?: string;
	describedBy?: string;
	disabled?: boolean;
	emptyMessage: string;
	id?: string;
	invalid?: boolean;
	onChange: (value: string) => void;
	options: SearchSelectOption[];
	placeholder: string;
	searchPlaceholder: string;
	value: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = options.find((option) => option.value === value);

	function select(nextValue: string): void {
		onChange(nextValue);
		setOpen(false);
	}

	return (
		<Popover open={open && !disabled} onOpenChange={(next) => setOpen(next && !disabled)}>
			<PopoverTrigger
				render={<Button type="button" variant="outline" disabled={disabled} />}
				id={id}
				role="combobox"
				aria-label={ariaLabel}
				aria-invalid={invalid}
				aria-describedby={describedBy}
				className="w-full justify-between"
			>
				<span className="flex min-w-0 items-center gap-2">
					{selected?.icon}
					<span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground")}>
						{selected ? <OptionLabel option={selected} /> : placeholder}
					</span>
				</span>
				<ChevronsUpDown />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--anchor-width) p-0">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList className="max-h-[min(18rem,var(--available-height))]">
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									keywords={[option.label, ...(option.keywords ?? [])]}
									onSelect={() => select(option.value)}
								>
									<Check className={cn(option.value === value ? "opacity-100" : "opacity-0")} />
									{option.icon}
									<span className="min-w-0 flex-1 truncate">
										<OptionLabel option={option} />
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

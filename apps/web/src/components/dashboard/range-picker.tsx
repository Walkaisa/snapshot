"use client";

import { Radio } from "@base-ui/react/radio";

import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface RangeOption {
	value: number;
	label: string;
}

export function RangePicker({
	label,
	name,
	options,
	value,
	onChange,
}: {
	label: string;
	name: string;
	options: RangeOption[];
	value: number;
	onChange: (value: number) => void;
}) {
	const activeIndex = Math.max(
		0,
		options.findIndex((option) => option.value === value),
	);

	return (
		<RadioGroup
			aria-label={label}
			name={name}
			value={String(value)}
			onValueChange={(next) => onChange(Number(next))}
			className="relative inline-grid w-auto auto-cols-fr grid-flow-col gap-0 rounded-lg border bg-muted/50 p-1 dark:bg-input/30"
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-md bg-background shadow-xs ring-1 ring-foreground/10 transition-transform duration-200 ease-out motion-reduce:transition-none"
				style={{
					width: `calc((100% - 0.5rem) / ${options.length})`,
					transform: `translateX(${activeIndex * 100}%)`,
				}}
			/>

			{options.map((option, index) => (
				<Radio.Root
					key={option.value}
					value={String(option.value)}
					className={cn(
						"relative z-10 flex h-7 select-none items-center justify-center whitespace-nowrap rounded-md px-3 font-medium text-muted-foreground text-sm outline-none transition-colors",
						"before:absolute before:inset-y-1.5 before:left-0 before:w-px before:bg-border before:transition-opacity",
						"hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:text-foreground",
						index === 0 || index === activeIndex || index === activeIndex + 1 ? "before:opacity-0" : "before:opacity-100",
					)}
				>
					{option.label}
				</Radio.Root>
			))}
		</RadioGroup>
	);
}

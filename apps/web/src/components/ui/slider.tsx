"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
	className,
	value,
	onValueChange,
	"aria-label": ariaLabel,
	...props
}: Omit<SliderPrimitive.Root.Props<number>, "value" | "onValueChange"> & {
	value: number;
	onValueChange: (value: number) => void;
	"aria-label"?: string;
}) {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			value={value}
			onValueChange={(next) => onValueChange(next)}
			className={cn("w-full", className)}
			{...props}
		>
			<SliderPrimitive.Control data-slot="slider-control" className="flex h-5 w-full touch-none select-none items-center py-2">
				<SliderPrimitive.Track data-slot="slider-track" className="h-1.5 w-full select-none rounded-full bg-secondary">
					<SliderPrimitive.Indicator data-slot="slider-indicator" className="select-none rounded-full bg-primary" />
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						aria-label={ariaLabel}
						className="size-4 cursor-pointer select-none rounded-full bg-primary shadow-sm outline-none transition-[box-shadow,scale] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-dragging:scale-110 data-disabled:opacity-50"
					/>
				</SliderPrimitive.Track>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };

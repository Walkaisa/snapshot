"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function FoldableCard({ className, defaultOpen = true, ...props }: Collapsible.Root.Props) {
	return (
		<Collapsible.Root
			data-slot="foldable-card"
			defaultOpen={defaultOpen}
			className={cn(
				"group/foldable-card flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground text-sm shadow-xs ring-1 ring-foreground/10 [--card-spacing:--spacing(6)]",
				className,
			)}
			{...props}
		/>
	);
}

function FoldableCardHeader({ className, children, ...props }: Collapsible.Trigger.Props) {
	return (
		<Collapsible.Trigger
			data-slot="foldable-card-header"
			className={cn(
				"group/foldable-card-header flex w-full cursor-pointer items-center gap-3 rounded-t-xl not-data-panel-open:rounded-b-xl p-(--card-spacing) text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
				className,
			)}
			{...props}
		>
			<div className="grid flex-1 auto-rows-min gap-1">{children}</div>
			<ChevronDown
				aria-hidden
				className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open/foldable-card-header:rotate-180"
			/>
		</Collapsible.Trigger>
	);
}

function FoldableCardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="foldable-card-title" className={cn("font-heading font-medium text-base leading-normal", className)} {...props} />
	);
}

function FoldableCardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="foldable-card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function FoldableCardContent({ className, children, ...props }: Collapsible.Panel.Props) {
	return (
		<Collapsible.Panel
			keepMounted
			data-slot="foldable-card-content"
			className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 data-open:not-data-starting-style:not-data-ending-style:overflow-visible"
			{...props}
		>
			<div className={cn("px-(--card-spacing) pb-(--card-spacing)", className)}>{children}</div>
		</Collapsible.Panel>
	);
}

export { FoldableCard, FoldableCardContent, FoldableCardDescription, FoldableCardHeader, FoldableCardTitle };

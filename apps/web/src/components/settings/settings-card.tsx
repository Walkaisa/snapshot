import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	FoldableCard,
	FoldableCardContent,
	FoldableCardDescription,
	FoldableCardHeader,
	FoldableCardTitle,
} from "@/components/ui/foldable-card";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsCard({
	title,
	description,
	defaultOpen = true,
	collapsible = true,
	children,
}: {
	title?: string;
	description?: string;
	defaultOpen?: boolean;
	collapsible?: boolean;
	children: ReactNode;
}) {
	if (!collapsible) {
		return (
			<Card>
				{title || description ? (
					<CardHeader>
						{title ? <CardTitle>{title}</CardTitle> : null}
						{description ? <CardDescription>{description}</CardDescription> : null}
					</CardHeader>
				) : null}
				<CardContent>
					<div className="grid gap-5">{children}</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<FoldableCard defaultOpen={defaultOpen}>
			<FoldableCardHeader>
				{title ? <FoldableCardTitle>{title}</FoldableCardTitle> : null}
				{description ? <FoldableCardDescription>{description}</FoldableCardDescription> : null}
			</FoldableCardHeader>
			<FoldableCardContent>
				<div className="grid gap-5">{children}</div>
			</FoldableCardContent>
		</FoldableCard>
	);
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
	return (
		<section className="grid content-start gap-4">
			<div className="grid gap-1">
				<p className="font-medium text-sm">{title}</p>
				{description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}

export function SettingsCardSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-64" />
			</CardHeader>
			<CardContent>
				<div className="grid gap-5">
					{Array.from({ length: rows }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton placeholder
						<Skeleton key={index} className="h-9 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

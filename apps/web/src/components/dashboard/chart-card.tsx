"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Delta({ current, previous }: { current: number; previous: number }) {
	const t = useTranslations("overview.charts.comparison");
	const format = useFormatter();

	if (previous === 0) {
		return current === 0 ? null : <span className="text-muted-foreground text-xs">{t("none")}</span>;
	}

	const ratio = (current - previous) / previous;

	if (ratio === 0) {
		return <span className="text-muted-foreground text-xs">{t("unchanged")}</span>;
	}

	const Icon = ratio > 0 ? ArrowUpRight : ArrowDownRight;
	const percent = format.number(Math.abs(ratio), { style: "percent", maximumFractionDigits: 0 });

	return (
		<span className="flex items-center gap-0.5 text-muted-foreground text-xs">
			<Icon className="size-3.5 shrink-0" />
			{ratio > 0 ? t("increase", { percent }) : t("decrease", { percent })}
		</span>
	);
}

export function ChartCard({
	title,
	description,
	value,
	delta,
	children,
}: {
	title: string;
	description: string;
	value?: ReactNode;
	delta?: { current: number; previous: number };
	children: ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				{value === undefined ? null : (
					<div className="mt-2 flex items-baseline gap-2">
						<span className="font-semibold text-2xl tracking-tight">{value}</span>
						{delta === undefined ? null : <Delta current={delta.current} previous={delta.previous} />}
					</div>
				)}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

export function ChartCardSkeleton({ height = "h-56" }: { height?: string }) {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="mt-1 h-4 w-56" />
				<Skeleton className="mt-3 h-8 w-24" />
			</CardHeader>
			<CardContent>
				<Skeleton className={cn("w-full rounded-lg", height)} />
			</CardContent>
		</Card>
	);
}

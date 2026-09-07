"use client";

import { type FormatUsage, humanReadableSize } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useStorageBreakdown } from "@/hooks/use-stats";
import { ChartCard, ChartCardSkeleton } from "./chart-card";
import { DashboardError } from "./dashboard-error";

const TOP_FORMATS = 6;
const ROW_HEIGHT = 40;
const CHART_PADDING = 16;

interface FormatRow {
	label: string;
	bytes: number;
	count: number;
	size: string;
}

function toRows(formats: FormatUsage[], otherLabel: string): FormatRow[] {
	const sorted = [...formats].sort((left, right) => right.bytes - left.bytes);
	const rows = sorted.slice(0, TOP_FORMATS).map((format) => ({
		label: `.${format.extension}`,
		bytes: format.bytes,
		count: format.count,
		size: humanReadableSize(format.bytes),
	}));
	const tail = sorted.slice(TOP_FORMATS);

	if (tail.length === 0) {
		return rows;
	}

	const bytes = tail.reduce((sum, format) => sum + format.bytes, 0);

	return [
		...rows,
		{ label: otherLabel, bytes, count: tail.reduce((sum, format) => sum + format.count, 0), size: humanReadableSize(bytes) },
	];
}

function fileCount(payload: unknown): number | null {
	if (typeof payload !== "object" || payload === null || !("count" in payload)) {
		return null;
	}

	return typeof payload.count === "number" ? payload.count : null;
}

export function StorageFormats() {
	const t = useTranslations("overview.charts.formats");
	const { data, isPending, isError, refetch } = useStorageBreakdown();
	const otherLabel = t("other");

	const rows = useMemo(() => (data === undefined ? [] : toRows(data.formats, otherLabel)), [data, otherLabel]);

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <ChartCardSkeleton height="h-40" />;
	}

	const config = {
		bytes: { label: t("series"), color: "var(--chart-2)" },
	} satisfies ChartConfig;

	return (
		<ChartCard title={t("title")} description={t("description")}>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">{t("empty")}</p>
			) : (
				<ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * ROW_HEIGHT + CHART_PADDING }}>
					<BarChart accessibilityLayer data={rows} layout="vertical" margin={{ right: 64 }}>
						<XAxis type="number" dataKey="bytes" hide />
						<YAxis type="category" dataKey="label" width={60} tickLine={false} axisLine={false} tickMargin={4} />
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, _name, _item, _index, payload) => {
										const count = fileCount(payload);

										return (
											<div className="flex flex-1 items-center justify-between gap-4">
												<span className="text-muted-foreground">
													{count === null ? t("series") : t("files", { count })}
												</span>
												<span className="font-medium font-mono tabular-nums">
													{humanReadableSize(Number(value))}
												</span>
											</div>
										);
									}}
								/>
							}
						/>
						<Bar dataKey="bytes" fill="var(--color-bytes)" radius={[0, 4, 4, 0]} maxBarSize={24}>
							<LabelList dataKey="size" position="right" offset={8} fontSize={11} className="fill-muted-foreground" />
						</Bar>
					</BarChart>
				</ChartContainer>
			)}
		</ChartCard>
	);
}

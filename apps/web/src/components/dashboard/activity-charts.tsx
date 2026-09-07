"use client";

import { DEFAULT_STATS_RANGE_DAYS, humanReadableSize, STATS_RANGE_DAYS, type UploadActivity } from "@snapshot/contracts";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useActivity } from "@/hooks/use-stats";
import { cn } from "@/lib/utils";
import { ChartCard, ChartCardSkeleton } from "./chart-card";
import { ChartLegendRow } from "./chart-legend-row";
import { DashboardError } from "./dashboard-error";
import { RangePicker } from "./range-picker";

const CHART_CLASS = "aspect-auto h-56 w-full";

function useDayFormatters() {
	const format = useFormatter();

	return useMemo(
		() => ({
			tick: (date: string) => format.dateTime(new Date(date), { month: "short", day: "numeric" }),
			full: (date: string) => format.dateTime(new Date(date), { dateStyle: "medium" }),
		}),
		[format],
	);
}

function UploadsChart({ activity }: { activity: UploadActivity }) {
	const t = useTranslations("overview.charts");
	const format = useFormatter();
	const day = useDayFormatters();

	const config = {
		uploads: { label: t("uploads.series"), color: "var(--chart-1)" },
	} satisfies ChartConfig;

	return (
		<ChartCard
			title={t("uploads.title")}
			description={t("uploads.description")}
			value={format.number(activity.totals.uploads)}
			delta={{ current: activity.totals.uploads, previous: activity.previous.uploads }}
		>
			<ChartContainer config={config} className={CHART_CLASS}>
				<BarChart accessibilityLayer data={activity.points} margin={{ top: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={day.tick} />
					<YAxis width={36} tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} />
					<ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => day.full(String(label))} />} />
					<Bar dataKey="uploads" fill="var(--color-uploads)" radius={[4, 4, 0, 0]} maxBarSize={24} />
				</BarChart>
			</ChartContainer>
		</ChartCard>
	);
}

function StorageChart({ activity }: { activity: UploadActivity }) {
	const t = useTranslations("overview.charts");
	const day = useDayFormatters();

	const points = useMemo(() => {
		let running = activity.startingBytes;

		return activity.points.map((point) => {
			running += point.bytes;

			return { date: point.date, stored: running };
		});
	}, [activity]);

	const config = {
		stored: { label: t("storage.series"), color: "var(--chart-4)" },
	} satisfies ChartConfig;

	return (
		<ChartCard
			title={t("storage.title")}
			description={t("storage.description")}
			value={humanReadableSize(activity.startingBytes + activity.totals.bytes)}
			delta={{ current: activity.totals.bytes, previous: activity.previous.bytes }}
		>
			<ChartContainer config={config} className={CHART_CLASS}>
				<AreaChart accessibilityLayer data={points} margin={{ top: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={day.tick} />
					<YAxis
						width={60}
						tickLine={false}
						axisLine={false}
						tickMargin={4}
						tickFormatter={(value: number) => humanReadableSize(value)}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								labelFormatter={(label) => day.full(String(label))}
								formatter={(value) => (
									<div className="flex flex-1 items-center justify-between gap-4">
										<span className="text-muted-foreground">{t("storage.series")}</span>
										<span className="font-medium font-mono tabular-nums">{humanReadableSize(Number(value))}</span>
									</div>
								)}
							/>
						}
					/>
					<Area
						dataKey="stored"
						type="monotone"
						stroke="var(--color-stored)"
						strokeWidth={2}
						fill="var(--color-stored)"
						fillOpacity={0.12}
						dot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</ChartCard>
	);
}

const VIEW_SERIES = [
	{ key: "pageViews", token: "var(--chart-1)" },
	{ key: "rawViews", token: "var(--chart-2)" },
	{ key: "downloadViews", token: "var(--chart-3)" },
	{ key: "linkVisits", token: "var(--chart-4)" },
] as const;

function ViewsChart({ activity }: { activity: UploadActivity }) {
	const t = useTranslations("overview.charts");
	const format = useFormatter();
	const day = useDayFormatters();

	const config = {
		pageViews: { label: t("views.page"), color: VIEW_SERIES[0].token },
		rawViews: { label: t("views.raw"), color: VIEW_SERIES[1].token },
		downloadViews: { label: t("views.download"), color: VIEW_SERIES[2].token },
		linkVisits: { label: t("views.link"), color: VIEW_SERIES[3].token },
	} satisfies ChartConfig;

	return (
		<ChartCard
			title={t("views.title")}
			description={t("views.description")}
			value={format.number(activity.totals.views)}
			delta={{ current: activity.totals.views, previous: activity.previous.views }}
		>
			<ChartContainer config={config} className={CHART_CLASS}>
				<AreaChart accessibilityLayer data={activity.points} margin={{ top: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={day.tick} />
					<YAxis width={36} tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} />
					<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(label) => day.full(String(label))} />} />
					{[...VIEW_SERIES].reverse().map((series) => (
						<Area
							key={series.key}
							dataKey={series.key}
							type="linear"
							stackId="views"
							stroke={`var(--color-${series.key})`}
							strokeWidth={2}
							fill={`var(--color-${series.key})`}
							fillOpacity={0.85}
							dot={false}
						/>
					))}
				</AreaChart>
			</ChartContainer>

			<ChartLegendRow
				entries={VIEW_SERIES.map((series) => ({ key: series.key, label: config[series.key].label, color: series.token }))}
			/>
		</ChartCard>
	);
}

export function ActivityCharts() {
	const t = useTranslations("overview.charts");
	const [days, setDays] = useState<number>(DEFAULT_STATS_RANGE_DAYS);
	const { data, isPending, isError, isPlaceholderData, refetch } = useActivity(days);

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="font-heading font-medium text-base">{t("section.title")}</h2>
					<p className="text-muted-foreground text-sm">{t("section.description")}</p>
				</div>
				<RangePicker
					label={t("range.label")}
					name="stats-range"
					value={days}
					onChange={setDays}
					options={STATS_RANGE_DAYS.map((value) => ({ value, label: t("range.days", { days: value }) }))}
				/>
			</div>

			{isError ? (
				<DashboardError onRetry={() => void refetch()} />
			) : isPending ? (
				<div className="flex flex-col gap-4">
					<ChartCardSkeleton />
					<div className="grid gap-4 lg:grid-cols-2">
						<ChartCardSkeleton />
						<ChartCardSkeleton />
					</div>
				</div>
			) : (
				<div className={cn("flex flex-col gap-4 transition-opacity", isPlaceholderData && "opacity-60")}>
					<UploadsChart activity={data} />
					<div className="grid gap-4 lg:grid-cols-2">
						<StorageChart activity={data} />
						<ViewsChart activity={data} />
					</div>
				</div>
			)}
		</section>
	);
}

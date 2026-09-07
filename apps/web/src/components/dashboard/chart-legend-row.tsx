export interface ChartLegendEntry {
	key: string;
	label: string;
	color: string;
}

export function ChartLegendRow({ entries }: { entries: ChartLegendEntry[] }) {
	return (
		<ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3">
			{entries.map((entry) => (
				<li key={entry.key} className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
					{entry.label}
				</li>
			))}
		</ul>
	);
}

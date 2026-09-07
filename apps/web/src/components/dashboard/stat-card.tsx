import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode }) {
	return (
		<Card size="sm">
			<CardContent>
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-muted-foreground text-sm">{label}</p>
						<p className="mt-1.5 truncate font-semibold text-2xl tracking-tight">{value}</p>
					</div>
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
						<Icon className="size-4" />
					</div>
				</div>
				{hint ? <div className="mt-2 text-muted-foreground text-xs">{hint}</div> : null}
			</CardContent>
		</Card>
	);
}

export function StatCardSkeleton() {
	return (
		<Card size="sm">
			<CardContent>
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="mt-2 h-7 w-16" />
					</div>
					<Skeleton className="size-9 shrink-0 rounded-lg" />
				</div>
			</CardContent>
		</Card>
	);
}

"use client";

import { HardDrive, Link2, Package } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOverview } from "@/hooks/use-dashboard";
import { DashboardError } from "./dashboard-error";
import { StatCard, StatCardSkeleton } from "./stat-card";
import { VersionCard } from "./version-card";

export function OverviewStats() {
	const t = useTranslations("overview");
	const { data, isPending, isError, refetch } = useOverview();

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{["a", "b", "c", "d"].map((key) => (
					<StatCardSkeleton key={key} />
				))}
			</div>
		);
	}

	const { uploads, links, version } = data;

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard icon={Package} label={t("cards.uploads")} value={uploads.count} />
			<StatCard icon={Link2} label={t("cards.links")} value={links.count} />
			<StatCard icon={HardDrive} label={t("cards.storage")} value={uploads.totalSizeHuman} />
			<VersionCard version={version} />
		</div>
	);
}

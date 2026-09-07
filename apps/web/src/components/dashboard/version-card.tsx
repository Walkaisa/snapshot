"use client";

import type { VersionInfo } from "@snapshot/contracts";
import { CircleCheck, GitBranch, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatCard } from "./stat-card";

function VersionHint({ latest, updateAvailable }: { latest: string; updateAvailable: boolean }) {
	const t = useTranslations("update");

	if (updateAvailable) {
		return (
			<span className="flex items-center gap-1.5 text-primary">
				<Sparkles className="size-3.5" />
				{t("available", { latest })}
			</span>
		);
	}

	return (
		<span className="flex items-center gap-1.5 text-outcome-success">
			<CircleCheck className="size-3.5" />
			{t("upToDate")}
		</span>
	);
}

export function VersionCard({ version }: { version: VersionInfo }) {
	const t = useTranslations("overview.cards");
	const hint = version.latest === null ? undefined : <VersionHint latest={version.latest} updateAvailable={version.updateAvailable} />;

	return <StatCard icon={GitBranch} label={t("version")} value={version.current ?? t("versionUnknown")} hint={hint} />;
}

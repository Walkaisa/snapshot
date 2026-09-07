"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { JsonCode } from "@/components/settings/json-code";
import { SettingsCard, SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useConfigView } from "@/hooks/use-dashboard";
import { SHAREX_CONFIG_PATH } from "@/lib/api/config";

function buildPreview(origin: string, maskedKey: string): string {
	const authorization = `Bearer ${maskedKey}`;

	return JSON.stringify(
		{
			Version: "17.0.0",
			Name: "Snapshot",
			DestinationType: "ImageUploader, FileUploader",
			RequestMethod: "POST",
			RequestURL: `${origin}/api/uploads`,
			Headers: { Authorization: authorization },
			Body: "MultipartFormData",
			FileFormName: "file",
			ResponseType: "JSON",
			URL: "{json:data.url}",
			ErrorMessage: "{json:message}",
			DeletionURL: "{json:data.deleteUrl}",
			DeletionMethod: "DELETE",
			DeletionHeaders: { Authorization: authorization },
		},
		null,
		2,
	);
}

export function ShareXCard() {
	const t = useTranslations("settings.sharex");
	const { data, isPending, isError, refetch } = useConfigView();
	const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_BASE_URL ?? "");

	useEffect(() => {
		if (origin.length === 0) {
			setOrigin(window.location.origin);
		}
	}, [origin]);

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={4} />;
	}

	return (
		<SettingsCard title={t("status")} description={t("statusHint")}>
			<div className="overflow-hidden rounded-lg border bg-secondary/40">
				<div className="flex items-center justify-between gap-2 border-b px-4 py-2">
					<span className="font-medium font-mono text-muted-foreground text-xs">snapshot.sxcu</span>
					<Badge variant="secondary">JSON</Badge>
				</div>
				<JsonCode source={buildPreview(origin, data.apiKey)} className="p-4" />
			</div>
			<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-sm">{t("downloadHint")}</p>
				<a href={SHAREX_CONFIG_PATH} download className={buttonVariants()}>
					<Download />
					{t("download")}
				</a>
			</div>
		</SettingsCard>
	);
}

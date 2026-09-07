"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { KeyField } from "@/components/settings/key-field";
import { SettingsCard, SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { useRotateApiKey } from "@/hooks/use-config";
import { useConfigView } from "@/hooks/use-dashboard";
import { ApiError } from "@/lib/api/types";

export function ApiKeyCard() {
	const t = useTranslations("settings.apiKey");
	const { data, isPending, isError, refetch } = useConfigView();
	const rotate = useRotateApiKey();
	const [confirmOpen, setConfirmOpen] = useState(false);

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={2} />;
	}

	async function onRotate(): Promise<void> {
		try {
			await rotate.mutateAsync();
			setConfirmOpen(false);
			toast.success(t("rotated"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("rotateError"));
		}
	}

	return (
		<SettingsCard title={t("label")} description={t("description")}>
			<KeyField id="api-key" masked={data.apiKey} />
			<p className="text-muted-foreground text-sm">
				{t.rich("usage", {
					code: (chunks) => <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">{chunks}</code>,
				})}
			</p>
			<div className="flex items-center justify-between gap-3 border-t pt-4">
				<p className="text-muted-foreground text-sm">{t("rotateHint")}</p>
				<Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)}>
					{t("rotate")}
				</Button>
			</div>
			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t("confirmTitle")}
				description={t("confirmDescription")}
				confirmLabel={t("rotate")}
				onConfirm={onRotate}
				pending={rotate.isPending}
				destructive
			/>
		</SettingsCard>
	);
}

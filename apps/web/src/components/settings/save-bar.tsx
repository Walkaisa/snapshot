"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function SaveBar({ dirty, saving, onReset }: { dirty: boolean; saving: boolean; onReset: () => void }) {
	const t = useTranslations("settings.saveBar");

	if (!dirty) {
		return null;
	}

	return (
		<div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border bg-card/95 py-3 pr-3 pl-4 shadow-lg backdrop-blur">
			<span className="text-muted-foreground text-sm">{t("unsaved")}</span>
			<div className="flex items-center gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={saving}>
					{t("reset")}
				</Button>
				<Button type="submit" size="sm" disabled={saving}>
					{saving ? t("saving") : t("save")}
				</Button>
			</div>
		</div>
	);
}

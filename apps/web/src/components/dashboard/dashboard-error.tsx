"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardError({ onRetry }: { onRetry: () => void }) {
	const t = useTranslations("overview");

	return (
		<Card size="sm">
			<CardContent>
				<div className="flex items-center justify-between gap-4">
					<p className="text-muted-foreground text-sm">{t("error")}</p>
					<Button variant="outline" size="sm" onClick={onRetry}>
						{t("retry")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

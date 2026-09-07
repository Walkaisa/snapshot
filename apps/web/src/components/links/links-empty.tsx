"use client";

import { Link2Off, Plus, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function LinksEmpty({ searching = false, onCreate }: { searching?: boolean; onCreate: () => void }) {
	const t = useTranslations("links.empty");
	const Icon = searching ? SearchX : Link2Off;
	const key = searching ? "noMatches" : "none";

	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
				<Icon className="size-6" />
			</div>
			<div className="flex flex-col gap-1">
				<p className="font-medium">{t(`${key}.title`)}</p>
				<p className="max-w-sm text-muted-foreground text-sm">{t(`${key}.description`)}</p>
			</div>
			{searching ? null : (
				<Button type="button" onClick={onCreate}>
					<Plus />
					{t("none.action")}
				</Button>
			)}
		</div>
	);
}

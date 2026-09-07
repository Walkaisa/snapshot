"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { navItems } from "./nav-items";

export function PageHeader() {
	const pathname = usePathname();
	const t = useTranslations("nav");
	const active = navItems.find((item) => item.href === pathname);

	if (!active) {
		return null;
	}

	const descriptionKey = `subtitle.${active.labelKey}`;

	return (
		<div className="mb-6 flex flex-col gap-1">
			<h1 className="font-heading font-semibold text-2xl tracking-tight">{t(active.labelKey)}</h1>
			{t.has(descriptionKey) ? <p className="text-muted-foreground text-sm">{t(descriptionKey)}</p> : null}
		</div>
	);
}

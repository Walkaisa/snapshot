"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { navGroups, navItems } from "./nav-items";

export function TopBar() {
	const pathname = usePathname();
	const t = useTranslations("nav");
	const active = navItems.find((item) => item.href === pathname);
	const activeGroup = navGroups.find((group) => group.items.some((item) => item.href === active?.href));

	return (
		<header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center border-b bg-background px-4 md:flex lg:px-6">
			<Breadcrumb aria-label={t("breadcrumb")}>
				<BreadcrumbList>
					{activeGroup?.labelKey ? (
						<>
							<BreadcrumbItem>
								<span className="text-muted-foreground">{t(`groups.${activeGroup.labelKey}`)}</span>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
						</>
					) : null}
					{active ? (
						<BreadcrumbItem>
							<BreadcrumbPage>{t(active.labelKey)}</BreadcrumbPage>
						</BreadcrumbItem>
					) : null}
				</BreadcrumbList>
			</Breadcrumb>
		</header>
	);
}

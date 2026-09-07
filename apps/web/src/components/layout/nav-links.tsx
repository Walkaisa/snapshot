"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { navGroups } from "./nav-items";

export function NavLinks() {
	const pathname = usePathname();
	const t = useTranslations("nav");
	const { isMobile, setOpenMobile } = useSidebar();

	function closeMobileSidebar(): void {
		if (isMobile) {
			setOpenMobile(false);
		}
	}

	return (
		<>
			{navGroups.map((group, index) => (
				<SidebarGroup key={group.labelKey ?? `group-${index}`}>
					{group.labelKey ? <SidebarGroupLabel>{t(`groups.${group.labelKey}`)}</SidebarGroupLabel> : null}
					<SidebarGroupContent>
						<SidebarMenu>
							{group.items.map((item) => {
								const Icon = item.icon;
								const label = t(item.labelKey);

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											render={<Link href={item.href} onClick={closeMobileSidebar} />}
											isActive={pathname === item.href}
											tooltip={label}
										>
											<Icon />
											<span>{label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			))}
		</>
	);
}

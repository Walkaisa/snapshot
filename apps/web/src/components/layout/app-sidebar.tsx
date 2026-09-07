"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export function AppSidebar() {
	const app = useTranslations("app");
	const common = useTranslations("common");

	return (
		<>
			<div className="flex h-16 items-center justify-between bg-sidebar px-4 text-sidebar-foreground md:hidden">
				<Link href="/overview" aria-label={app("name")} className="min-w-0">
					<Brand />
				</Link>
				<SidebarTrigger aria-label={common("menu")} />
			</div>
			<Sidebar variant="sidebar" collapsible="icon" mobileTitle={common("menu")} mobileDescription={app("tagline")}>
				<SidebarHeader className="h-16 justify-center border-sidebar-border border-b px-4 py-0">
					<div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
						<Link href="/overview" aria-label={app("name")} className="min-w-0 group-data-[collapsible=icon]:hidden">
							<Brand />
						</Link>
						<SidebarTrigger aria-label={common("menu")} />
					</div>
				</SidebarHeader>
				<SidebarContent>
					<NavLinks />
				</SidebarContent>
				<SidebarFooter>
					<SignOutButton />
				</SidebarFooter>
				<SidebarRail aria-label={common("menu")} />
			</Sidebar>
		</>
	);
}

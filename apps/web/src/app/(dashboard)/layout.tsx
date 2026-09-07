import type { SessionData } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesSync } from "@/components/layout/preferences-sync";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getUserLocaleChoice } from "@/i18n/locale";
import { serverApi } from "@/lib/api/server";
import { createQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const queryClient = createQueryClient();

	const [localeChoice] = await Promise.all([
		getUserLocaleChoice(),
		queryClient.prefetchQuery({
			queryKey: queryKeys.session,
			queryFn: () => serverApi<SessionData>("/api/auth/session"),
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SidebarProvider className="flex-col md:flex-row">
				<AppSidebar />
				<SidebarInset>
					<TopBar />
					<div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6 lg:p-8">
						<PageHeader />
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
			<PreferencesSync localeChoice={localeChoice} />
		</HydrationBoundary>
	);
}

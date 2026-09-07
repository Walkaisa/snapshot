import type { SessionList } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MfaCard } from "@/components/settings/mfa-card";
import { SessionsCard } from "@/components/settings/sessions-card";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";

export default async function SecurityPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.sessions,
		queryFn: () => serverApi<SessionList>("/api/auth/sessions"),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<div className="grid gap-6">
				<ChangePasswordForm />
				<MfaCard />
				<SessionsCard />
			</div>
		</HydrationBoundary>
	);
}

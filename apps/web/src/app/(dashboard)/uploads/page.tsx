import { type ConfigView, generateUnreservedId, idShapeFor, type SessionData } from "@snapshot/contracts";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { UploadSettings } from "@/components/settings/upload-settings-form";
import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/get-query-client";
import { publicBaseUrl } from "@/lib/public-base-url";
import { queryKeys } from "@/lib/query-keys";

export default async function UploadsPage() {
	const queryClient = getQueryClient();

	const [config, session] = await Promise.all([
		queryClient.fetchQuery({
			queryKey: queryKeys.config,
			queryFn: () => serverApi<ConfigView>("/api/config"),
		}),
		serverApi<SessionData>("/api/auth/session"),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<UploadSettings
				baseUrl={publicBaseUrl()}
				previewFileId={generateUnreservedId(idShapeFor(config, "upload"))}
				username={session.username}
			/>
		</HydrationBoundary>
	);
}

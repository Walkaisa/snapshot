import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { staleTime: 30_000 },
			dehydrate: {
				shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === "pending",
			},
		},
	});
}

export const getQueryClient = cache(createQueryClient);

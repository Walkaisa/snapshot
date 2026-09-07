"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				{children}
				<Toaster />
			</TooltipProvider>
			{process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
		</QueryClientProvider>
	);
}

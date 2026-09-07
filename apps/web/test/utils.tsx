import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import { formats } from "@/i18n/formats";
import messages from "../messages/en.json";

export function renderWithProviders(ui: ReactElement): RenderResult {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});

	return render(
		<NextIntlClientProvider locale="en" messages={messages} formats={formats} now={new Date()} timeZone="UTC">
			<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
		</NextIntlClientProvider>,
	);
}

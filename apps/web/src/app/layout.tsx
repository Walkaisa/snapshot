import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const inter = localFont({ src: "../fonts/inter-variable.woff2", variable: "--font-sans", weight: "100 900" });
const jetBrainsMono = localFont({
	src: "../fonts/jetbrains-mono-variable.woff2",
	variable: "--font-mono",
	weight: "100 800",
});
const lora = localFont({
	src: "../fonts/lora-variable.woff2",
	variable: "--font-serif",
	weight: "400 700",
	preload: false,
});

export const metadata: Metadata = {
	title: "Snapshot",
	description: "Self-hosted media uploads",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	const locale = await getLocale();

	return (
		<html lang={locale} suppressHydrationWarning className={cn("font-sans", inter.variable, jetBrainsMono.variable, lora.variable)}>
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<NextIntlClientProvider>
						<Providers>{children}</Providers>
					</NextIntlClientProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

"use client";

import type { PublicLink } from "@snapshot/contracts";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Brand } from "@/components/layout/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COUNTDOWN_SECONDS = 3;

function hostOf(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

export function LinkRedirect({ link }: { link: PublicLink }) {
	const t = useTranslations("share.redirect");
	const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

	useEffect(() => {
		const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);

		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (remaining > 0) {
			return;
		}

		window.location.replace(link.targetUrl);
	}, [remaining, link.targetUrl]);

	const progress = ((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100;

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
			<Brand />

			<div className="flex w-full max-w-md flex-col gap-5 rounded-xl border bg-card p-6 text-center">
				<div className="flex flex-col gap-2">
					<h1 className="font-heading font-semibold text-xl tracking-tight">{t("title")}</h1>
					<p className="text-muted-foreground text-sm" aria-live="polite">
						{remaining > 0 ? t("countdown", { seconds: remaining }) : t("opening")}
					</p>
				</div>

				<div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 text-left">
					<span className="text-muted-foreground text-xs">{t("destination")}</span>
					<span className="truncate font-medium text-sm" title={link.targetUrl}>
						{hostOf(link.targetUrl)}
					</span>
					<span className="break-all text-muted-foreground text-xs">{link.targetUrl}</span>
				</div>

				<div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-secondary">
					<div
						className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<a href={link.targetUrl} rel="noopener noreferrer nofollow" className={cn(buttonVariants())}>
						<ExternalLink />
						{t("openNow")}
					</a>
					<p className="text-muted-foreground text-xs">{t("fallback")}</p>
				</div>
			</div>

			<a
				href="https://github.com/Walkaisa/snapshot"
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-muted-foreground text-xs underline-offset-4 hover:underline"
			>
				{t("footer")}
				<ArrowUpRight className="size-3" />
			</a>
		</div>
	);
}

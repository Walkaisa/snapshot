"use client";

import { ArrowUpRight, Rocket, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useMeta } from "@/hooks/use-meta";

const DISMISSED_VERSION_KEY = "snapshot.update-dismissed";

function readDismissedVersion(): string | null {
	try {
		return window.localStorage.getItem(DISMISSED_VERSION_KEY);
	} catch {
		return null;
	}
}

function rememberDismissedVersion(version: string): void {
	try {
		window.localStorage.setItem(DISMISSED_VERSION_KEY, version);
	} catch {
		return;
	}
}

export function UpdateNotice() {
	const t = useTranslations("update");
	const { data } = useMeta();
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
	const [storageRead, setStorageRead] = useState(false);

	useEffect(() => {
		setDismissedVersion(readDismissedVersion());
		setStorageRead(true);
	}, []);

	if (!storageRead || data === undefined) {
		return null;
	}

	const { current, latest, updateAvailable } = data.version;

	if (!updateAvailable || current === null || latest === null || dismissedVersion === latest) {
		return null;
	}

	return (
		<div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-primary/5 p-3 ring-1 ring-primary/20 dark:bg-primary/10">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
				<Rocket className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-sm">{t("title")}</p>
				<p className="text-muted-foreground text-sm">{t("description", { latest, current })}</p>
			</div>
			<div className="flex items-center gap-2">
				<a
					href={`${data.repository}/releases/latest`}
					target="_blank"
					rel="noreferrer"
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					{t("release")}
					<ArrowUpRight />
				</a>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => {
						rememberDismissedVersion(latest);
						setDismissedVersion(latest);
					}}
					aria-label={t("dismiss")}
				>
					<X />
				</Button>
			</div>
		</div>
	);
}

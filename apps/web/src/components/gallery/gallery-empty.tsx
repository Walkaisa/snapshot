"use client";

import { CloudUpload, ImageOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GalleryEmpty({ onUpload }: { onUpload: () => void }) {
	const t = useTranslations("gallery.empty");

	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
				<ImageOff className="size-6" />
			</div>
			<div className="flex flex-col gap-1">
				<p className="font-medium">{t("title")}</p>
				<p className="max-w-sm text-muted-foreground text-sm">{t("description")}</p>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button type="button" onClick={onUpload}>
					<CloudUpload />
					{t("upload")}
				</Button>
				<Link href="/sharex" className={cn(buttonVariants({ variant: "outline" }))}>
					{t("cta")}
				</Link>
			</div>
		</div>
	);
}

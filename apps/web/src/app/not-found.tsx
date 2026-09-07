import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
	const t = await getTranslations("notFound");

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
			<h1 className="font-semibold text-2xl">{t("title")}</h1>
			<p className="max-w-sm text-muted-foreground text-sm">{t("description")}</p>
			<Link href="/overview" className={buttonVariants()}>
				{t("back")}
			</Link>
		</div>
	);
}

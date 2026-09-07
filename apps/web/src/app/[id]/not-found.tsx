import { getTranslations } from "next-intl/server";

import { Brand } from "@/components/layout/brand";

export default async function ShareNotFound() {
	const t = await getTranslations("share.notFound");

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
			<Brand />
			<div className="flex flex-col gap-2">
				<h1 className="font-semibold text-2xl">{t("title")}</h1>
				<p className="max-w-sm text-muted-foreground text-sm">{t("description")}</p>
			</div>
		</div>
	);
}

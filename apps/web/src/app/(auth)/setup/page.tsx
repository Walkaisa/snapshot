import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { SetupForm } from "@/components/auth/setup-form";

export default async function SetupPage() {
	const t = await getTranslations("auth.setup");

	return (
		<AuthCard title={t("title")} description={t("description")}>
			<SetupForm />
		</AuthCard>
	);
}

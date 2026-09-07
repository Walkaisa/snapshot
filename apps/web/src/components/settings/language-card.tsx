"use client";

import type { LocaleChoice } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { type FlagCountry, FlagIcon } from "@/components/ui/flag-icon";
import { useSession, useUpdatePreferences } from "@/hooks/use-account";
import { type Locale, locales } from "@/i18n/config";
import { ApiError } from "@/lib/api/types";

import { SearchSelect, type SearchSelectOption } from "./search-select";
import { SettingsCard } from "./settings-card";

const LOCALE_LABELS: Record<Locale, string> = { en: "English", de: "Deutsch" };

const LOCALE_FLAGS: Record<Locale, FlagCountry> = { en: "gb", de: "de" };

export function LanguageCard() {
	const t = useTranslations("settings.appearance.language");
	const ta = useTranslations("settings.appearance");
	const { data } = useSession();
	const update = useUpdatePreferences();

	const active: LocaleChoice = data?.locale ?? "system";

	const options: SearchSelectOption[] = [
		{ value: "system", label: t("options.system"), keywords: ["auto"], isDefault: true },
		...locales.map((code) => ({
			value: code,
			label: LOCALE_LABELS[code],
			keywords: [code],
			icon: <FlagIcon country={LOCALE_FLAGS[code]} className="text-base" />,
		})),
	];

	async function onChange(value: string): Promise<void> {
		const choice = value as LocaleChoice;

		if (choice === active) {
			return;
		}

		try {
			await update.mutateAsync({ locale: choice });
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : ta("saveError"));
		}
	}

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<SearchSelect
				ariaLabel={t("title")}
				value={active}
				onChange={(value) => void onChange(value)}
				options={options}
				placeholder={t("select.placeholder")}
				searchPlaceholder={t("select.searchPlaceholder")}
				emptyMessage={t("select.empty")}
				disabled={update.isPending}
			/>
		</SettingsCard>
	);
}

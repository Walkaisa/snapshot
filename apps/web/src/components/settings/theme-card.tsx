"use client";

import type { ThemeChoice } from "@snapshot/contracts";
import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useSession, useUpdatePreferences } from "@/hooks/use-account";
import { ApiError } from "@/lib/api/types";
import { OptionPicker, type PickerOption } from "./option-picker";
import { SettingsCard } from "./settings-card";

const THEME_OPTIONS: { value: ThemeChoice; icon: LucideIcon }[] = [
	{ value: "system", icon: Monitor },
	{ value: "light", icon: Sun },
	{ value: "dark", icon: Moon },
];

export function ThemeCard() {
	const t = useTranslations("settings.appearance.theme");
	const ta = useTranslations("settings.appearance");
	const { forcedTheme, setTheme, theme } = useTheme();
	const { data } = useSession();
	const update = useUpdatePreferences();

	const active: ThemeChoice = data?.theme ?? "system";

	const options: PickerOption<ThemeChoice>[] = THEME_OPTIONS.map((option) => ({
		value: option.value,
		label: t(`options.${option.value}`),
		icon: option.icon,
		isDefault: option.value === "system",
	}));

	async function onChange(value: ThemeChoice): Promise<void> {
		const previousTheme = theme ?? active;
		setTheme(value);

		try {
			await update.mutateAsync({ theme: value });
		} catch (error) {
			setTheme(previousTheme);
			toast.error(error instanceof ApiError ? error.message : ta("saveError"));
		}
	}

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<OptionPicker
				label={t("title")}
				name="theme"
				value={active}
				onChange={(value) => void onChange(value)}
				options={options}
				disabled={Boolean(forcedTheme) || update.isPending}
			/>
		</SettingsCard>
	);
}

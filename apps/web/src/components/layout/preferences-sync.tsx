"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { useSession } from "@/hooks/use-account";
import { changeLocale } from "@/i18n/actions";
import type { LocaleChoice } from "@/i18n/config";

export function PreferencesSync({ localeChoice }: { localeChoice: LocaleChoice }) {
	const { data } = useSession();
	const { theme: appliedTheme, setTheme } = useTheme();
	const synchronizedTheme = useRef<string | undefined>(undefined);
	const theme = data?.theme;
	const locale = data?.locale;

	useEffect(() => {
		if (theme && theme !== synchronizedTheme.current) {
			synchronizedTheme.current = theme;

			if (theme === appliedTheme) {
				return;
			}

			setTheme(theme);
		}
	}, [theme, appliedTheme, setTheme]);

	useEffect(() => {
		if (locale && locale !== localeChoice) {
			void changeLocale(locale);
		}
	}, [locale, localeChoice]);

	return null;
}

import { cookies, headers } from "next/headers";

import { defaultLocale, LOCALE_COOKIE, type Locale, type LocaleChoice, locales } from "./config";

function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale);
}

function detectLocale(acceptLanguage: string | null): Locale {
	if (acceptLanguage === null) {
		return defaultLocale;
	}

	const ranked = acceptLanguage
		.split(",")
		.map((entry) => {
			const [tag = "", qParam] = entry.trim().split(";q=");
			const quality = qParam === undefined ? 1 : Number.parseFloat(qParam);

			return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
		})
		.sort((a, b) => b.quality - a.quality);

	for (const { tag } of ranked) {
		const base = tag.split("-")[0];

		if (isLocale(base)) {
			return base;
		}
	}

	return defaultLocale;
}

export async function getUserLocaleChoice(): Promise<LocaleChoice> {
	const value = (await cookies()).get(LOCALE_COOKIE)?.value;

	return isLocale(value) ? value : "system";
}

export async function getUserLocale(): Promise<Locale> {
	const value = (await cookies()).get(LOCALE_COOKIE)?.value;

	if (isLocale(value)) {
		return value;
	}

	return detectLocale((await headers()).get("accept-language"));
}

export async function setUserLocale(choice: LocaleChoice): Promise<void> {
	const store = await cookies();

	if (choice === "system") {
		store.delete(LOCALE_COOKIE);
	} else {
		store.set(LOCALE_COOKIE, choice, { path: "/", maxAge: 60 * 60 * 24 * 365 });
	}
}

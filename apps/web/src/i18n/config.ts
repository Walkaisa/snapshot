import { SUPPORTED_LOCALES } from "@snapshot/contracts";

export const locales = SUPPORTED_LOCALES;
export type Locale = (typeof locales)[number];

export type LocaleChoice = Locale | "system";

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

import type { SearchSelectOption } from "@/components/settings/search-select";

const LOCALE_CODES = [
	"en_US",
	"en_GB",
	"de_DE",
	"fr_FR",
	"es_ES",
	"it_IT",
	"nl_NL",
	"pl_PL",
	"pt_BR",
	"tr_TR",
	"sv_SE",
	"ja_JP",
	"ko_KR",
	"zh_CN",
	"zh_TW",
] as const;

const FALLBACK_TIMEZONES = [
	"UTC",
	"Europe/Berlin",
	"Europe/London",
	"Europe/Paris",
	"Europe/Warsaw",
	"America/New_York",
	"America/Los_Angeles",
	"America/Sao_Paulo",
	"Asia/Tokyo",
	"Asia/Seoul",
	"Asia/Shanghai",
	"Australia/Sydney",
] as const;

function titleCase(value: string): string {
	return value.length > 0 ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}` : value;
}

function localeLabel(value: string, displayLocale: string): string {
	const normalized = value.replaceAll("_", "-");
	const locale = new Intl.Locale(normalized);
	const languageNames = new Intl.DisplayNames([displayLocale], { type: "language" });
	const regionNames = new Intl.DisplayNames([displayLocale], { type: "region" });
	const language = titleCase(languageNames.of(locale.language) ?? locale.language);
	const region = locale.region ? regionNames.of(locale.region) : undefined;

	return region ? `${language} (${region})` : language;
}

export function localeOptions(activeValue: string, displayLocale: string): SearchSelectOption[] {
	const values = new Set<string>([...LOCALE_CODES, activeValue]);

	return Array.from(values).map((value) => ({
		value,
		label: localeLabel(value, displayLocale),
		keywords: [value, value.replaceAll("_", "-")],
	}));
}

function supportedTimeZones(): string[] {
	const intlWithTimeZones = Intl as typeof Intl & {
		supportedValuesOf?: (key: "timeZone") => string[];
	};

	return Array.from(new Set(["UTC", ...(intlWithTimeZones.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES)]));
}

function timeZoneLabel(value: string): string {
	if (value === "UTC") {
		return "UTC";
	}

	const [region, ...locationParts] = value.split("/");
	const location = locationParts.at(-1)?.replaceAll("_", " ") ?? value;

	return `${location} (${region})`;
}

export function timeZoneOptions(activeValue: string): SearchSelectOption[] {
	const values = new Set<string>([...supportedTimeZones(), activeValue]);

	return Array.from(values).map((value) => ({
		value,
		label: timeZoneLabel(value),
		keywords: [value, value.replaceAll("_", " ")],
	}));
}

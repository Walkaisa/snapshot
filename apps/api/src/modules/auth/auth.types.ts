import type { LocaleChoice, ThemeChoice } from "@snapshot/contracts";

export interface AuthAdmin {
	id: string;
	username: string;
	theme: ThemeChoice;
	locale: LocaleChoice;
}

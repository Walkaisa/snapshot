"use server";

import { revalidatePath } from "next/cache";

import type { LocaleChoice } from "./config";
import { setUserLocale } from "./locale";

export async function changeLocale(choice: LocaleChoice): Promise<void> {
	await setUserLocale(choice);
	revalidatePath("/", "layout");
}

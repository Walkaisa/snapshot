import { getRequestConfig } from "next-intl/server";

import { formats } from "./formats";
import { getUserLocale } from "./locale";

export default getRequestConfig(async () => {
	const locale = await getUserLocale();

	return {
		locale,
		now: new Date(),
		timeZone: "UTC",
		formats,
		messages: (await import(`../../messages/${locale}.json`)).default,
	};
});

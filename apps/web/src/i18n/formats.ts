import type { Formats } from "next-intl";

export const formats = {
	dateTime: {
		date: { dateStyle: "medium" },
		dateTime: { dateStyle: "medium", timeStyle: "short" },
		precise: { dateStyle: "medium", timeStyle: "medium" },
	},
} satisfies Formats;

export interface ParsedUserAgent {
	browser: string | null;
	os: string | null;
	mobile: boolean;
}

const BROWSER_MATCHERS: readonly (readonly [RegExp, string])[] = [
	[/edg(?:e|a|ios)?\//i, "Edge"],
	[/opr\/|opera/i, "Opera"],
	[/samsungbrowser\//i, "Samsung Internet"],
	[/firefox\/|fxios\//i, "Firefox"],
	[/chrome\/|crios\//i, "Chrome"],
	[/version\/.*safari\//i, "Safari"],
];

const OS_MATCHERS: readonly (readonly [RegExp, string])[] = [
	[/windows nt/i, "Windows"],
	[/android/i, "Android"],
	[/iphone|ipad|ipod/i, "iOS"],
	[/mac os x|macintosh/i, "macOS"],
	[/cros/i, "ChromeOS"],
	[/linux/i, "Linux"],
];

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
	if (userAgent === null || userAgent.trim().length === 0) {
		return { browser: null, os: null, mobile: false };
	}

	const browser = BROWSER_MATCHERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
	const os = OS_MATCHERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
	const mobile = /mobi|android|iphone|ipad|ipod/i.test(userAgent);

	return { browser, os, mobile };
}

import { describe, expect, it } from "vitest";

import { parseUserAgent } from "@/lib/user-agent";

const CHROME_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EDGE_WINDOWS =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const SAFARI_MACOS =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const SAFARI_IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

describe("parseUserAgent", () => {
	it("detects desktop browsers and operating systems", () => {
		expect(parseUserAgent(CHROME_WINDOWS)).toEqual({ browser: "Chrome", os: "Windows", mobile: false });
		expect(parseUserAgent(FIREFOX_LINUX)).toEqual({ browser: "Firefox", os: "Linux", mobile: false });
		expect(parseUserAgent(SAFARI_MACOS)).toEqual({ browser: "Safari", os: "macOS", mobile: false });
	});

	it("prefers Edge over the embedded Chrome token", () => {
		expect(parseUserAgent(EDGE_WINDOWS)).toEqual({ browser: "Edge", os: "Windows", mobile: false });
	});

	it("flags mobile devices", () => {
		expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ browser: "Safari", os: "iOS", mobile: true });
		expect(parseUserAgent(CHROME_ANDROID)).toEqual({ browser: "Chrome", os: "Android", mobile: true });
	});

	it("returns nulls for missing or unknown agents", () => {
		expect(parseUserAgent(null)).toEqual({ browser: null, os: null, mobile: false });
		expect(parseUserAgent("  ")).toEqual({ browser: null, os: null, mobile: false });
		expect(parseUserAgent("curl/8.7.1")).toEqual({ browser: null, os: null, mobile: false });
	});
});

import { describe, expect, it } from "vitest";

import { narrowToMediaConfig, splitSharedIdConfig } from "../../../src/modules/runtime-config/runtime-config.defaults.js";

describe("splitSharedIdConfig", () => {
	it("copies a pre-split shared key onto both feature shapes", () => {
		expect(splitSharedIdConfig({ idMinDigits: 3 })).toEqual({ uploadIdMinDigits: 3, linkIdMinDigits: 3 });
	});

	it("leaves a value the feature already carries alone", () => {
		expect(splitSharedIdConfig({ idMinDigits: 3, uploadIdMinDigits: 1 })).toEqual({ linkIdMinDigits: 3 });
	});

	it("returns nothing when there is no shared key", () => {
		expect(splitSharedIdConfig({ uploadIdLength: 10 })).toEqual({});
	});
});

describe("narrowToMediaConfig", () => {
	it("drops the entries Snapshot cannot store", () => {
		expect(narrowToMediaConfig({ allowedExtensions: ".png, .txt, .pdf" })).toEqual({ allowedExtensions: ".png" });
	});

	it("falls back to the defaults when nothing media survives", () => {
		expect(narrowToMediaConfig({ allowedMimeTypes: "text/plain" })).toEqual({ allowedMimeTypes: null });
	});

	it("leaves a list that is already media-only untouched", () => {
		expect(narrowToMediaConfig({ allowedExtensions: ".png, .mp4", allowedMimeTypes: "image/png" })).toEqual({});
	});

	it("ignores keys the table does not carry", () => {
		expect(narrowToMediaConfig({ uploadIdLength: 10 })).toEqual({});
	});
});

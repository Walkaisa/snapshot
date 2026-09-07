import { describe, expect, it } from "vitest";

import { breachFor, fileExtension, uploadRules } from "@/lib/upload-rules";

const limits = { allowedExtensions: null, allowedMimeTypes: null, maxFileSizeBytes: 1024 };

function file(name: string, type: string, size: number): File {
	return { name, type, size } as File;
}

describe("fileExtension", () => {
	it.each([
		["shot.PNG", ".png"],
		["a.tar.gz", ".gz"],
		["no-extension", ""],
		[".hidden", ""],
	])("reads %j as %j", (name, expected) => {
		expect(fileExtension(name)).toBe(expected);
	});
});

describe("uploadRules", () => {
	it("falls back to the full media registry when nothing is restricted", () => {
		const rules = uploadRules(limits);

		expect(rules.extensions).toContain(".png");
		expect(rules.mimeTypes).toContain("video/mp4");
		expect(rules.accept).toContain(".png");
	});

	it("narrows to the configured extensions", () => {
		const rules = uploadRules({ ...limits, allowedExtensions: "PNG, .jpg" });

		expect(rules.extensions).toEqual([".jpg", ".png"]);
	});

	it("drops a configured entry that is not a media type", () => {
		expect(uploadRules({ ...limits, allowedExtensions: ".png, .txt" }).extensions).toEqual([".png"]);
	});
});

describe("breachFor", () => {
	const rules = uploadRules(limits);

	it("accepts a media file inside the limit", () => {
		expect(breachFor(file("shot.png", "image/png", 512), rules)).toBeNull();
	});

	it("accepts a file whose browser reported no type", () => {
		expect(breachFor(file("clip.mp4", "", 512), rules)).toBeNull();
	});

	it("refuses a non-media extension", () => {
		expect(breachFor(file("notes.txt", "text/plain", 10), rules)).toBe("type");
	});

	it("refuses a type that disagrees with the extension", () => {
		expect(breachFor(file("shot.png", "image/jpeg", 512), rules)).toBe("type");
	});

	it("refuses a file the configured list leaves out", () => {
		expect(breachFor(file("shot.png", "image/png", 512), uploadRules({ ...limits, allowedExtensions: ".jpg" }))).toBe("type");
	});

	it("refuses an empty file", () => {
		expect(breachFor(file("shot.png", "image/png", 0), rules)).toBe("empty");
	});

	it("refuses a file over the size limit", () => {
		expect(breachFor(file("shot.png", "image/png", 2048), rules)).toBe("size");
	});
});

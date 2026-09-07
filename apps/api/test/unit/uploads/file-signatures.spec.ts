import { describe, expect, it } from "vitest";

import { detectContentType } from "../../../src/modules/uploads/file-signatures.js";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const gif = Buffer.from("GIF89a");
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
const avi = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("AVI ")]);
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from("isom")]);
const matroska = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);

describe("detectContentType", () => {
	it.each([
		[".png", png, "image/png"],
		[".jpg", jpeg, "image/jpeg"],
		[".gif", gif, "image/gif"],
		[".webp", webp, "image/webp"],
		[".avi", avi, "video/x-msvideo"],
		[".mp4", mp4, "video/mp4"],
	])("detects %s as %s", (extension, sample, expected) => {
		expect(detectContentType(extension, sample)).toBe(expected);
	});

	it("resolves the matroska container by extension", () => {
		expect(detectContentType(".webm", matroska)).toBe("video/webm");
		expect(detectContentType(".mkv", matroska)).toBe("video/x-matroska");
	});

	it("returns null for content it does not recognise", () => {
		expect(detectContentType(".png", Buffer.from("just some plain text"))).toBeNull();
	});
});

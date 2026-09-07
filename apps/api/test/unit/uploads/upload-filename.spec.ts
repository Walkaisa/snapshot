import { describe, expect, it } from "vitest";

import { parseUploadFilename, uploadFilename } from "../../../src/modules/uploads/upload-filename.js";

describe("uploadFilename", () => {
	it("joins id and extension", () => {
		expect(uploadFilename("abc123", "png")).toBe("abc123.png");
	});
});

describe("parseUploadFilename", () => {
	it("splits id and lowercased extension", () => {
		expect(parseUploadFilename("abc123XYZ9.PNG")).toEqual({ id: "abc123XYZ9", extension: "png" });
	});

	it.each([".upload-01b0f82b-fd28-4f67-9011-713ea6815634.tmp", "archive.tar.gz", "ab.png", ".gitkeep", "noextension", ""])(
		"rejects %j",
		(filename) => {
			expect(parseUploadFilename(filename)).toBeNull();
		},
	);
});

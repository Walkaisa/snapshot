import { describe, expect, it } from "vitest";

import { imageDimensions } from "../../../src/modules/uploads/image-dimensions.js";

function png(width: number, height: number): Buffer {
	const head = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
	head.writeUInt32BE(13, 8);
	head.write("IHDR", 12, "latin1");
	head.writeUInt32BE(width, 16);
	head.writeUInt32BE(height, 20);

	return head;
}

function gif(width: number, height: number): Buffer {
	const head = Buffer.alloc(13);
	head.write("GIF89a", 0, "latin1");
	head.writeUInt16LE(width, 6);
	head.writeUInt16LE(height, 8);

	return head;
}

function bmp(width: number, height: number, headerSize = 40): Buffer {
	const head = Buffer.alloc(26);
	head.write("BM", 0, "latin1");
	head.writeUInt32LE(headerSize, 14);

	if (headerSize === 12) {
		head.writeUInt16LE(width, 18);
		head.writeUInt16LE(height, 20);
	} else {
		head.writeInt32LE(width, 18);
		head.writeInt32LE(height, 22);
	}

	return head;
}

function jpeg(width: number, height: number, { withExif = false, marker = 0xc0 } = {}): Buffer {
	const parts = [Buffer.from([0xff, 0xd8])];

	if (withExif) {
		const exif = Buffer.alloc(2 + 64);
		exif.writeUInt16BE(exif.length, 0);
		parts.push(Buffer.from([0xff, 0xe1]), exif);
	}

	const sof = Buffer.alloc(2 + 7);
	sof.writeUInt16BE(sof.length, 0);
	sof.writeUInt8(8, 2);
	sof.writeUInt16BE(height, 3);
	sof.writeUInt16BE(width, 5);
	parts.push(Buffer.from([0xff, marker]), sof);

	return Buffer.concat(parts);
}

function webp(chunk: string, fill: (head: Buffer) => void): Buffer {
	const head = Buffer.alloc(32);
	head.write("RIFF", 0, "latin1");
	head.write("WEBP", 8, "latin1");
	head.write(chunk, 12, "latin1");
	fill(head);

	return head;
}

function tiff(width: number, height: number, little = true): Buffer {
	const head = Buffer.alloc(8 + 2 + 24);
	const writeU16 = (value: number, at: number): number => (little ? head.writeUInt16LE(value, at) : head.writeUInt16BE(value, at));
	const writeU32 = (value: number, at: number): number => (little ? head.writeUInt32LE(value, at) : head.writeUInt32BE(value, at));

	head.write(little ? "II" : "MM", 0, "latin1");
	writeU16(42, 2);
	writeU32(8, 4);
	writeU16(2, 8);

	writeU16(0x0100, 10);
	writeU16(4, 12);
	writeU32(1, 14);
	writeU32(width, 18);

	writeU16(0x0101, 22);
	writeU16(4, 24);
	writeU32(1, 26);
	writeU32(height, 30);

	return head;
}

describe("imageDimensions", () => {
	it("reads a PNG IHDR", () => {
		expect(imageDimensions(png(1920, 1080), "image/png")).toEqual({ width: 1920, height: 1080 });
	});

	it("reads a GIF logical screen descriptor", () => {
		expect(imageDimensions(gif(320, 240), "image/gif")).toEqual({ width: 320, height: 240 });
	});

	it("reads a BITMAPINFOHEADER bitmap", () => {
		expect(imageDimensions(bmp(64, 48), "image/bmp")).toEqual({ width: 64, height: 48 });
	});

	it("reads a legacy BITMAPCOREHEADER bitmap", () => {
		expect(imageDimensions(bmp(64, 48, 12), "image/bmp")).toEqual({ width: 64, height: 48 });
	});

	it("takes the absolute height of a top-down bitmap", () => {
		expect(imageDimensions(bmp(64, -48), "image/bmp")).toEqual({ width: 64, height: 48 });
	});

	it("finds the JPEG frame header behind an EXIF segment", () => {
		expect(imageDimensions(jpeg(730, 476, { withExif: true }), "image/jpeg")).toEqual({ width: 730, height: 476 });
	});

	it.each([0xc0, 0xc1, 0xc2, 0xc9])("accepts SOF marker 0x%s", (marker) => {
		expect(imageDimensions(jpeg(8, 8, { marker }), "image/jpeg")).toEqual({ width: 8, height: 8 });
	});

	it.each([0xc4, 0xc8, 0xcc])("does not read a huffman/reserved marker 0x%s as a frame", (marker) => {
		expect(imageDimensions(jpeg(8, 8, { marker }), "image/jpeg")).toBeNull();
	});

	it("reads a lossy VP8 webp", () => {
		const head = webp("VP8 ", (buffer) => {
			buffer.writeUInt16LE(640, 26);
			buffer.writeUInt16LE(480, 28);
		});

		expect(imageDimensions(head, "image/webp")).toEqual({ width: 640, height: 480 });
	});

	it("reads a lossless VP8L webp", () => {
		const head = webp("VP8L", (buffer) => buffer.writeUInt32LE((99 & 0x3fff) | ((49 & 0x3fff) << 14), 21));

		expect(imageDimensions(head, "image/webp")).toEqual({ width: 100, height: 50 });
	});

	it("reads an extended VP8X webp", () => {
		const head = webp("VP8X", (buffer) => {
			buffer.writeUIntLE(1919, 24, 3);
			buffer.writeUIntLE(1079, 27, 3);
		});

		expect(imageDimensions(head, "image/webp")).toEqual({ width: 1920, height: 1080 });
	});

	it.each([true, false])("reads a TIFF in both byte orders (little=%s)", (little) => {
		expect(imageDimensions(tiff(200, 100, little), "image/tiff")).toEqual({ width: 200, height: 100 });
	});

	it("refuses a mime type it does not parse", () => {
		expect(imageDimensions(png(10, 10), "image/heic")).toBeNull();
	});

	it("refuses a zero dimension", () => {
		expect(imageDimensions(png(0, 10), "image/png")).toBeNull();
	});

	it.each([
		["image/png", 4],
		["image/gif", 4],
		["image/bmp", 4],
		["image/jpeg", 3],
		["image/webp", 4],
		["image/tiff", 4],
	])("returns null for a truncated %s instead of throwing", (mimeType, length) => {
		expect(imageDimensions(Buffer.alloc(length, 0xff), mimeType)).toBeNull();
	});

	it("terminates on a buffer of pure marker bytes", () => {
		expect(imageDimensions(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(4096, 0xff)]), "image/jpeg")).toBeNull();
	});

	it("terminates on random noise", () => {
		const noise = Buffer.alloc(2048);

		for (let index = 0; index < noise.length; index += 1) {
			noise[index] = (index * 37) % 256;
		}

		for (const mimeType of ["image/png", "image/gif", "image/bmp", "image/jpeg", "image/webp", "image/tiff"]) {
			expect(() => imageDimensions(noise, mimeType)).not.toThrow();
		}
	});
});

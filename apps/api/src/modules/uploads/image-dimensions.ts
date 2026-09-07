export interface Dimensions {
	width: number;
	height: number;
}

const MAX_JPEG_SEGMENTS = 256;
const MAX_TIFF_ENTRIES = 512;
const TIFF_TYPE_SHORT = 3;
const TIFF_TAG_WIDTH = 0x0100;
const TIFF_TAG_HEIGHT = 0x0101;
const WEBP_DIMENSION_MASK = 0x3fff;

function dimensions(width: number, height: number): Dimensions | null {
	return Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 ? { width, height } : null;
}

function pngDimensions(head: Buffer): Dimensions | null {
	if (head.length < 24 || head.toString("latin1", 12, 16) !== "IHDR") {
		return null;
	}

	return dimensions(head.readUInt32BE(16), head.readUInt32BE(20));
}

function gifDimensions(head: Buffer): Dimensions | null {
	if (head.length < 10) {
		return null;
	}

	return dimensions(head.readUInt16LE(6), head.readUInt16LE(8));
}

function bmpDimensions(head: Buffer): Dimensions | null {
	if (head.length < 26) {
		return null;
	}

	if (head.readUInt32LE(14) === 12) {
		return dimensions(head.readUInt16LE(18), head.readUInt16LE(20));
	}

	return dimensions(head.readInt32LE(18), Math.abs(head.readInt32LE(22)));
}

function isStartOfFrame(marker: number): boolean {
	return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function isStandaloneMarker(marker: number): boolean {
	return marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function jpegDimensions(head: Buffer): Dimensions | null {
	if (head.length < 4 || head.readUInt16BE(0) !== 0xffd8) {
		return null;
	}

	let offset = 2;

	for (let segment = 0; segment < MAX_JPEG_SEGMENTS; segment += 1) {
		while (offset < head.length && head[offset] !== 0xff) {
			offset += 1;
		}

		while (offset < head.length && head[offset] === 0xff) {
			offset += 1;
		}

		if (offset >= head.length) {
			return null;
		}

		const marker = head[offset] as number;
		offset += 1;

		if (isStandaloneMarker(marker)) {
			continue;
		}

		if (marker === 0xd9 || marker === 0xda || offset + 2 > head.length) {
			return null;
		}

		const length = head.readUInt16BE(offset);

		if (length < 2) {
			return null;
		}

		if (isStartOfFrame(marker)) {
			return offset + 7 > head.length ? null : dimensions(head.readUInt16BE(offset + 5), head.readUInt16BE(offset + 3));
		}

		offset += length;
	}

	return null;
}

function webpDimensions(head: Buffer): Dimensions | null {
	if (head.length < 16 || head.toString("latin1", 8, 12) !== "WEBP") {
		return null;
	}

	const chunk = head.toString("latin1", 12, 16);

	if (chunk === "VP8X" && head.length >= 30) {
		return dimensions(head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1);
	}

	if (chunk === "VP8L" && head.length >= 25) {
		const bits = head.readUInt32LE(21);

		return dimensions((bits & WEBP_DIMENSION_MASK) + 1, ((bits >>> 14) & WEBP_DIMENSION_MASK) + 1);
	}

	if (chunk === "VP8 " && head.length >= 30) {
		return dimensions(head.readUInt16LE(26) & WEBP_DIMENSION_MASK, head.readUInt16LE(28) & WEBP_DIMENSION_MASK);
	}

	return null;
}

function tiffDimensions(head: Buffer): Dimensions | null {
	if (head.length < 8) {
		return null;
	}

	const order = head.toString("latin1", 0, 2);

	if (order !== "II" && order !== "MM") {
		return null;
	}

	const little = order === "II";
	const readU16 = (at: number): number => (little ? head.readUInt16LE(at) : head.readUInt16BE(at));
	const readU32 = (at: number): number => (little ? head.readUInt32LE(at) : head.readUInt32BE(at));
	const directory = readU32(4);

	if (directory + 2 > head.length) {
		return null;
	}

	const entries = Math.min(readU16(directory), MAX_TIFF_ENTRIES);
	let width = 0;
	let height = 0;

	for (let index = 0; index < entries; index += 1) {
		const entry = directory + 2 + index * 12;

		if (entry + 12 > head.length) {
			break;
		}

		const value = readU16(entry + 2) === TIFF_TYPE_SHORT ? readU16(entry + 8) : readU32(entry + 8);

		if (readU16(entry) === TIFF_TAG_WIDTH) {
			width = value;
		} else if (readU16(entry) === TIFF_TAG_HEIGHT) {
			height = value;
		}
	}

	return dimensions(width, height);
}

const PARSERS: Record<string, (head: Buffer) => Dimensions | null> = {
	"image/bmp": bmpDimensions,
	"image/gif": gifDimensions,
	"image/jpeg": jpegDimensions,
	"image/png": pngDimensions,
	"image/tiff": tiffDimensions,
	"image/webp": webpDimensions,
};

export function imageDimensions(head: Buffer, mimeType: string): Dimensions | null {
	return PARSERS[mimeType]?.(head) ?? null;
}

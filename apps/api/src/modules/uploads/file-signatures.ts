export const SIGNATURE_SAMPLE_BYTES = 64;

function startsWith(sample: Buffer, signature: readonly number[]): boolean {
	if (sample.length < signature.length) {
		return false;
	}

	return signature.every((byte, index) => sample[index] === byte);
}

function ascii(text: string): number[] {
	return [...text].map((character) => character.charCodeAt(0));
}

export function detectContentType(extension: string, sample: Buffer): string | null {
	if (startsWith(sample, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return "image/png";
	}

	if (startsWith(sample, [0xff, 0xd8, 0xff])) {
		return "image/jpeg";
	}

	if (startsWith(sample, ascii("GIF87a")) || startsWith(sample, ascii("GIF89a"))) {
		return "image/gif";
	}

	if (startsWith(sample, ascii("BM"))) {
		return "image/bmp";
	}

	if (startsWith(sample, [0x49, 0x49, 0x2a, 0x00]) || startsWith(sample, [0x4d, 0x4d, 0x00, 0x2a])) {
		return "image/tiff";
	}

	if (startsWith(sample, ascii("RIFF")) && sample.subarray(8, 12).toString("latin1") === "WEBP") {
		return "image/webp";
	}

	if (startsWith(sample, ascii("FLV"))) {
		return "video/x-flv";
	}

	if (startsWith(sample, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])) {
		return "video/x-ms-wmv";
	}

	if (startsWith(sample, [0x1a, 0x45, 0xdf, 0xa3])) {
		return extension === ".webm" ? "video/webm" : "video/x-matroska";
	}

	if (startsWith(sample, ascii("RIFF")) && sample.subarray(8, 12).toString("latin1") === "AVI ") {
		return "video/x-msvideo";
	}

	if (sample.length >= 12 && sample.subarray(4, 8).toString("latin1") === "ftyp") {
		const majorBrand = sample.subarray(8, 12).toString("latin1");

		if (extension === ".mov" || majorBrand === "qt  ") {
			return "video/quicktime";
		}

		return "video/mp4";
	}

	return null;
}

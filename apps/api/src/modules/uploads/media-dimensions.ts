import { open } from "node:fs/promises";

import { type Dimensions, imageDimensions } from "./image-dimensions.js";

export type { Dimensions };

const IMAGE_HEAD_BYTES = 64 * 1024;
const BOX_HEADER_BYTES = 8;
const LARGE_BOX_HEADER_BYTES = 16;
const MAX_MOOV_BYTES = 32 * 1024 * 1024;
const FIXED_16_16 = 65_536;
const TKHD_TAIL_BYTES = 52;

interface Box {
	type: string;
	payload: Buffer;
}

async function probeImage(path: string, mimeType: string): Promise<Dimensions | null> {
	const handle = await open(path, "r");

	try {
		const head = Buffer.alloc(IMAGE_HEAD_BYTES);
		const { bytesRead } = await handle.read(head, 0, IMAGE_HEAD_BYTES, 0);

		return imageDimensions(head.subarray(0, bytesRead), mimeType);
	} catch {
		return null;
	} finally {
		await handle.close();
	}
}

async function readMoov(path: string): Promise<Buffer | null> {
	const handle = await open(path, "r");

	try {
		const { size: fileSize } = await handle.stat();
		const header = Buffer.alloc(LARGE_BOX_HEADER_BYTES);
		let offset = 0;

		while (offset + BOX_HEADER_BYTES <= fileSize) {
			const { bytesRead } = await handle.read(header, 0, LARGE_BOX_HEADER_BYTES, offset);

			if (bytesRead < BOX_HEADER_BYTES) {
				return null;
			}

			let size = header.readUInt32BE(0);
			const type = header.toString("latin1", 4, 8);
			let headerSize = BOX_HEADER_BYTES;

			if (size === 1) {
				if (bytesRead < LARGE_BOX_HEADER_BYTES) {
					return null;
				}

				size = Number(header.readBigUInt64BE(8));
				headerSize = LARGE_BOX_HEADER_BYTES;
			} else if (size === 0) {
				size = fileSize - offset;
			}

			if (size < headerSize) {
				return null;
			}

			if (type === "moov") {
				const payloadSize = size - headerSize;

				if (payloadSize <= 0 || payloadSize > MAX_MOOV_BYTES) {
					return null;
				}

				const moov = Buffer.alloc(payloadSize);
				await handle.read(moov, 0, payloadSize, offset + headerSize);

				return moov;
			}

			offset += size;
		}

		return null;
	} catch {
		return null;
	} finally {
		await handle.close();
	}
}

function* boxes(buffer: Buffer): Generator<Box> {
	let offset = 0;

	while (offset + BOX_HEADER_BYTES <= buffer.length) {
		let size = buffer.readUInt32BE(offset);
		const type = buffer.toString("latin1", offset + 4, offset + 8);
		let headerSize = BOX_HEADER_BYTES;

		if (size === 1) {
			if (offset + LARGE_BOX_HEADER_BYTES > buffer.length) {
				return;
			}

			size = Number(buffer.readBigUInt64BE(offset + 8));
			headerSize = LARGE_BOX_HEADER_BYTES;
		} else if (size === 0) {
			size = buffer.length - offset;
		}

		if (size < headerSize || offset + size > buffer.length) {
			return;
		}

		yield { type, payload: buffer.subarray(offset + headerSize, offset + size) };
		offset += size;
	}
}

export function tkhdDimensions(tkhd: Buffer): Dimensions | null {
	const version = tkhd.readUInt8(0);
	const offset = 4 + (version === 1 ? 32 : 20) + TKHD_TAIL_BYTES;

	if (offset + 8 > tkhd.length) {
		return null;
	}

	const width = Math.round(tkhd.readUInt32BE(offset) / FIXED_16_16);
	const height = Math.round(tkhd.readUInt32BE(offset + 4) / FIXED_16_16);

	return width > 0 && height > 0 ? { width, height } : null;
}

export function moovDimensions(moov: Buffer): Dimensions | null {
	for (const track of boxes(moov)) {
		if (track.type !== "trak") {
			continue;
		}

		for (const inner of boxes(track.payload)) {
			if (inner.type === "tkhd") {
				const dimensions = tkhdDimensions(inner.payload);

				if (dimensions !== null) {
					return dimensions;
				}
			}
		}
	}

	return null;
}

export async function probeDimensions(path: string, mimeType: string): Promise<Dimensions | null> {
	if (mimeType.startsWith("image/")) {
		return probeImage(path, mimeType);
	}

	if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
		const moov = await readMoov(path);

		return moov === null ? null : moovDimensions(moov);
	}

	return null;
}

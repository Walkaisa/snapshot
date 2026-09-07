export interface ByteRange {
	start: number;
	end: number;
}

export type RangeRequest = ByteRange | "unsatisfiable" | null;

const SINGLE_RANGE = /^bytes=(\d*)-(\d*)$/;

export function parseByteRange(header: string | undefined, sizeBytes: number): RangeRequest {
	if (header === undefined) {
		return null;
	}

	const match = SINGLE_RANGE.exec(header.trim());

	if (match === null) {
		return null;
	}

	const [, rawStart = "", rawEnd = ""] = match;

	if (rawStart === "" && rawEnd === "") {
		return null;
	}

	if (rawStart === "") {
		const suffix = Number(rawEnd);

		if (suffix === 0 || sizeBytes === 0) {
			return "unsatisfiable";
		}

		return { start: Math.max(0, sizeBytes - suffix), end: sizeBytes - 1 };
	}

	const start = Number(rawStart);

	if (start >= sizeBytes) {
		return "unsatisfiable";
	}

	const end = rawEnd === "" ? sizeBytes - 1 : Math.min(Number(rawEnd), sizeBytes - 1);

	return end < start ? "unsatisfiable" : { start, end };
}

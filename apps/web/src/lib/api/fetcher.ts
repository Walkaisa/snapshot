import { type ApiEnvelope, ApiError } from "./types";

export function unwrapEnvelope<T>(status: number, ok: boolean, body: ApiEnvelope<T> | null, retryAfterHeader: string | null): T {
	if (ok && body !== null && body.success === true) {
		return body.data;
	}

	const retryAfter = status === 429 ? Number(retryAfterHeader) || undefined : undefined;

	if (body !== null && body.success === false) {
		throw new ApiError(status, body.message, body.data.errorCode, body.data.details, retryAfter);
	}

	throw new ApiError(status, "Request failed", "internal_server_error", undefined, retryAfter);
}

export async function request<T>(input: string, init?: RequestInit): Promise<T> {
	let response: Response;

	try {
		response = await fetch(input, init);
	} catch {
		throw new ApiError(0, "Unable to reach the server", "network_error");
	}

	const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

	return unwrapEnvelope<T>(response.status, response.ok, body, response.headers.get("retry-after"));
}

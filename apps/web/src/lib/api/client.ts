import { request, unwrapEnvelope } from "./fetcher";
import { type ApiEnvelope, ApiError } from "./types";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
	if (csrfToken === null) {
		const data = await request<{ csrfToken: string }>("/api/auth/csrf", { credentials: "include" });
		csrfToken = data.csrfToken;
	}

	return csrfToken;
}

export function resetCsrfToken(): void {
	csrfToken = null;
}

export function setCsrfToken(token: string): void {
	csrfToken = token;
}

export async function clientApi<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
	const method = (init.method ?? "GET").toUpperCase();
	const isMutation = !SAFE_METHODS.has(method);
	const headers = new Headers(init.headers);

	if (isMutation) {
		headers.set("x-csrf-token", await getCsrfToken());

		if (init.body !== undefined && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}
	}

	try {
		return await request<T>(path, { ...init, headers, credentials: "include" });
	} catch (error) {
		if (retry && isMutation && error instanceof ApiError && error.status === 403) {
			resetCsrfToken();
			return clientApi<T>(path, init, false);
		}

		throw error;
	}
}

export interface UploadOptions {
	onProgress?: (fraction: number) => void;
	signal?: AbortSignal;
}

function send<T>(path: string, body: FormData, token: string, options: UploadOptions): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.open("POST", path, true);
		xhr.withCredentials = true;
		xhr.responseType = "text";
		xhr.setRequestHeader("x-csrf-token", token);

		const abort = (): void => xhr.abort();

		const finish = (): void => options.signal?.removeEventListener("abort", abort);

		xhr.upload.addEventListener("progress", (event) => {
			if (event.lengthComputable && event.total > 0) {
				options.onProgress?.(event.loaded / event.total);
			}
		});

		xhr.addEventListener("load", () => {
			finish();
			let envelope: ApiEnvelope<T> | null = null;

			try {
				envelope = JSON.parse(xhr.responseText) as ApiEnvelope<T>;
			} catch {
				envelope = null;
			}

			try {
				resolve(
					unwrapEnvelope<T>(xhr.status, xhr.status >= 200 && xhr.status < 300, envelope, xhr.getResponseHeader("retry-after")),
				);
			} catch (error) {
				reject(error);
			}
		});

		xhr.addEventListener("error", () => {
			finish();
			reject(new ApiError(0, "Unable to reach the server", "network_error"));
		});

		xhr.addEventListener("abort", () => {
			finish();
			reject(new ApiError(0, "Upload cancelled", "network_error"));
		});

		if (options.signal?.aborted) {
			reject(new ApiError(0, "Upload cancelled", "network_error"));
			return;
		}

		options.signal?.addEventListener("abort", abort, { once: true });
		xhr.send(body);
	});
}

export async function clientUpload<T>(path: string, body: FormData, options: UploadOptions = {}, retry = true): Promise<T> {
	try {
		return await send<T>(path, body, await getCsrfToken(), options);
	} catch (error) {
		if (retry && error instanceof ApiError && error.status === 403) {
			resetCsrfToken();
			return clientUpload<T>(path, body, options, false);
		}

		throw error;
	}
}

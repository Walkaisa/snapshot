import type { ApiErrorBody, ErrorCode } from "@snapshot/contracts";

export interface ApiSuccess<T> {
	success: true;
	status: "success";
	message: string;
	data: T;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorBody;

export type ClientErrorCode = ErrorCode | "network_error";

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly errorCode: ClientErrorCode,
		readonly details?: unknown,
		readonly retryAfter?: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

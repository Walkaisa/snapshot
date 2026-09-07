import { HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@snapshot/contracts";

const STATUS_ERROR_CODES: Partial<Record<number, ErrorCode>> = {
	[HttpStatus.UNAUTHORIZED]: "unauthorized",
	[HttpStatus.FORBIDDEN]: "forbidden",
	[HttpStatus.CONFLICT]: "conflict",
	[HttpStatus.BAD_REQUEST]: "validation_error",
	[HttpStatus.UNPROCESSABLE_ENTITY]: "validation_error",
	[HttpStatus.TOO_MANY_REQUESTS]: "rate_limit_exceeded",
	[HttpStatus.NOT_FOUND]: "not_found",
	[HttpStatus.PAYLOAD_TOO_LARGE]: "file_too_large",
};

export function errorCodeForStatus(status: number): ErrorCode {
	return STATUS_ERROR_CODES[status] ?? "internal_server_error";
}

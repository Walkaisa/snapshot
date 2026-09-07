import { HttpException } from "@nestjs/common";
import type { ErrorCode } from "@snapshot/contracts";

export class AppException extends HttpException {
	constructor(
		status: number,
		message: string,
		readonly errorCode: ErrorCode,
		readonly details?: unknown,
	) {
		super(message, status);
	}
}

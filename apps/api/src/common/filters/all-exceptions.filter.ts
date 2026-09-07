import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { ApiErrorBody, ErrorCode } from "@snapshot/contracts";
import type { Request, Response } from "express";
import { ZodValidationException } from "nestjs-zod";
import { ZodError } from "zod";

import { AppException } from "../exceptions/app.exception.js";
import { errorCodeForStatus } from "../utils/error-code.js";
import { getRequestId } from "../utils/request-id.js";

interface NormalizedError {
	status: number;
	message: string;
	errorCode: ErrorCode;
	details?: unknown;
}

function extractHttpMessage(exception: HttpException): string {
	const response = exception.getResponse();

	if (typeof response === "string") {
		return response;
	}

	if (response !== null && typeof response === "object" && "message" in response) {
		const { message } = response;

		if (Array.isArray(message)) {
			return message.filter((item): item is string => typeof item === "string").join(", ");
		}

		if (typeof message === "string") {
			return message;
		}
	}

	return exception.message;
}

function normalizeException(exception: unknown): NormalizedError {
	if (exception instanceof AppException) {
		return {
			status: exception.getStatus(),
			message: exception.message,
			errorCode: exception.errorCode,
			details: exception.details,
		};
	}

	if (exception instanceof ZodValidationException) {
		const zodError: unknown = exception.getZodError();
		const issues = zodError instanceof ZodError ? zodError.issues : [];

		return {
			status: exception.getStatus(),
			message: "Validation failed",
			errorCode: "validation_error",
			details: issues.map((issue) => ({
				path: issue.path.map(String).join("."),
				message: issue.message,
			})),
		};
	}

	if (exception instanceof HttpException) {
		const status = exception.getStatus();
		return {
			status,
			message: extractHttpMessage(exception),
			errorCode: errorCodeForStatus(status),
		};
	}

	return { status: 500, message: "Internal server error", errorCode: "internal_server_error" };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();
		const requestId = getRequestId(request);
		const { status, message, errorCode, details } = normalizeException(exception);

		if (status >= 500) {
			this.logger.error({ err: exception, requestId }, `Unhandled error: ${message}`);
		} else {
			this.logger.warn({ requestId, errorCode, status }, message);
		}

		const body: ApiErrorBody = {
			success: false,
			status: "error",
			message,
			data: { errorCode, requestId, details },
		};

		response.setHeader("x-request-id", requestId);
		response.status(status).json(body);
	}
}

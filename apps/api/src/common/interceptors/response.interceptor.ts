import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, StreamableFile } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { map, type Observable } from "rxjs";

import { RESPONSE_MESSAGE_KEY, SKIP_ENVELOPE_KEY } from "../decorators/response.decorator.js";
import { getRequestId } from "../utils/request-id.js";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const targets = [context.getHandler(), context.getClass()];
		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const response = http.getResponse<Response>();

		response.setHeader("x-request-id", getRequestId(request));

		if (this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, targets) ?? false) {
			return next.handle();
		}

		const message = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, targets) ?? "OK";

		return next.handle().pipe(
			map((data: unknown) => {
				if (data instanceof StreamableFile) {
					return data;
				}

				return { success: true, status: "success", message, data: data ?? null };
			}),
		);
	}
}

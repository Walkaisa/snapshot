import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { IS_PUBLIC_KEY } from "../../../common/decorators/auth.decorator.js";
import { AppException } from "../../../common/exceptions/app.exception.js";
import type { AuthAdmin } from "../auth.types.js";
import { SessionManagerService } from "../session-manager.service.js";

type AuthenticatableRequest = Request & { user?: AuthAdmin };

@Injectable()
export class AuthenticatedGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly sessions: SessionManagerService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const targets = [context.getHandler(), context.getClass()];
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ?? false;
		const request = context.switchToHttp().getRequest<AuthenticatableRequest>();

		if (request.isAuthenticated() && this.sessions.absoluteLifetimeExceeded(request)) {
			const admin = request.user;

			if (admin !== undefined) {
				await this.sessions.logout(request, admin);
			}

			if (!isPublic) {
				throw new AppException(HttpStatus.UNAUTHORIZED, "Session expired", "unauthorized");
			}
		}

		if (isPublic) {
			return true;
		}

		if (request.isAuthenticated()) {
			return true;
		}

		throw new AppException(HttpStatus.UNAUTHORIZED, "Authentication required", "unauthorized");
	}
}

import { HttpStatus, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";

import { AppException } from "../../common/exceptions/app.exception.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthService } from "./auth.service.js";
import type { AuthAdmin } from "./auth.types.js";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly auth: AuthService,
		private readonly audit: AuditService,
	) {
		super();
	}

	async validate(username: string, password: string): Promise<AuthAdmin> {
		const admin = await this.auth.validateCredentials(username, password);

		if (admin === null) {
			this.audit.record({ action: "auth.sign_in", outcome: "failure", actor: "anonymous", errorCode: "unauthorized" });

			throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid credentials", "unauthorized");
		}

		return admin;
	}
}

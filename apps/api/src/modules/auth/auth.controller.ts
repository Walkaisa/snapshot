import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { AuthState, RevokeData, SessionList, SessionData as SessionPayload, SignInResult } from "@snapshot/contracts";
import type { CsrfSync } from "csrf-sync";
import type { Request } from "express";

import { AuditAction } from "../../common/decorators/audit.decorator.js";
import { CurrentAdmin, Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { AppException } from "../../common/exceptions/app.exception.js";
import { CSRF, LOGIN_ATTEMPT_LIMIT, MFA_ATTEMPT_LIMIT, REAUTHENTICATION_ATTEMPT_LIMIT, SETUP_ATTEMPT_LIMIT } from "./auth.constants.js";
import { PasswordChangeDto, SessionRevokeDto, SetupDto } from "./auth.dto.js";
import { AuthService } from "./auth.service.js";
import type { AuthAdmin } from "./auth.types.js";
import { AuthThrottle, authenticatedIdentity, credentialsIdentity, pendingMfaIdentity } from "./auth-throttle.decorator.js";
import { LocalAuthGuard } from "./guards/local-auth.guard.js";
import { MfaVerifyDto } from "./mfa.dto.js";
import { MfaService } from "./mfa.service.js";
import { SessionManagerService } from "./session-manager.service.js";
import { SessionRegistryService } from "./session-registry.service.js";

@Controller("auth")
export class AuthController {
	constructor(
		private readonly auth: AuthService,
		private readonly sessionManager: SessionManagerService,
		private readonly registry: SessionRegistryService,
		private readonly mfa: MfaService,
		@Inject(CSRF) private readonly csrf: CsrfSync,
	) {}

	private toSession(admin: AuthAdmin, csrfToken: string): SessionPayload {
		return { username: admin.username, csrfToken, theme: admin.theme, locale: admin.locale };
	}

	@Get("state")
	@Public()
	@ResponseMessage("Auth state")
	async state(@Req() request: Request): Promise<AuthState> {
		return {
			initialized: await this.auth.isInitialized(),
			authenticated: request.isAuthenticated(),
		};
	}

	@Get("csrf")
	@Public()
	@ResponseMessage("CSRF token issued")
	issueCsrf(@Req() request: Request): { csrfToken: string } {
		return { csrfToken: this.csrf.generateToken(request) };
	}

	@Post("setup")
	@Public()
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(SETUP_ATTEMPT_LIMIT, credentialsIdentity)
	@AuditAction("auth.setup")
	@ResponseMessage("Setup complete")
	async setup(@Body() dto: SetupDto, @Req() request: Request): Promise<SessionPayload> {
		const admin = await this.auth.createInitialAdmin(dto.username, dto.password);
		const csrfToken = await this.sessionManager.loginAndEstablish(request, admin);

		return this.toSession(admin, csrfToken);
	}

	@Post("sign-in")
	@Public()
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard, LocalAuthGuard)
	@AuthThrottle(LOGIN_ATTEMPT_LIMIT, credentialsIdentity)
	@AuditAction("auth.sign_in")
	@ResponseMessage("Signed in")
	async signIn(@CurrentAdmin() admin: AuthAdmin, @Req() request: Request): Promise<SignInResult> {
		if (await this.mfa.isEnabledFor(admin.id)) {
			return { mfaRequired: true, csrfToken: await this.sessionManager.beginMfaChallenge(request, admin) };
		}

		const csrfToken = await this.sessionManager.loginAndEstablish(request, admin);

		return { ...this.toSession(admin, csrfToken), mfaRequired: false };
	}

	@Post("sign-in/mfa")
	@Public()
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(MFA_ATTEMPT_LIMIT, pendingMfaIdentity)
	@AuditAction("auth.sign_in_mfa")
	@ResponseMessage("Signed in")
	async signInMfa(@Body() dto: MfaVerifyDto, @Req() request: Request): Promise<SessionPayload> {
		const adminId = this.sessionManager.pendingMfaAdminId(request);

		if (adminId === null) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Sign in again to continue", "unauthorized");
		}

		if (!(await this.mfa.verifyChallenge(adminId, dto.code))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "That code is not valid", "unauthorized");
		}

		const admin = await this.auth.findById(adminId);

		if (admin === null) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Sign in again to continue", "unauthorized");
		}

		const csrfToken = await this.sessionManager.completeMfaChallenge(request, admin);

		return this.toSession(admin, csrfToken);
	}

	@Post("sign-out")
	@HttpCode(HttpStatus.OK)
	@ResponseMessage("Signed out")
	async signOut(@CurrentAdmin() admin: AuthAdmin, @Req() request: Request): Promise<null> {
		await this.sessionManager.logout(request, admin);

		return null;
	}

	@Get("session")
	@ResponseMessage("Current session")
	async session(@CurrentAdmin() admin: AuthAdmin, @Req() request: Request): Promise<SessionPayload> {
		await this.sessionManager.touch(request);

		return this.toSession(admin, this.sessionManager.currentToken(request));
	}

	@Post("change-password")
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("auth.password_change")
	@ResponseMessage("Password changed")
	async changePassword(
		@CurrentAdmin() admin: AuthAdmin,
		@Body() dto: PasswordChangeDto,
		@Req() request: Request,
	): Promise<SessionPayload> {
		await this.auth.changePassword(admin.id, dto.currentPassword, dto.newPassword);
		await this.registry.revokeOthers(admin.id, request.sessionID);
		const csrfToken = await this.sessionManager.rotate(request, admin);

		return this.toSession(admin, csrfToken);
	}

	@Get("sessions")
	@ResponseMessage("Active sessions")
	async listSessions(@CurrentAdmin() admin: AuthAdmin, @Req() request: Request): Promise<SessionList> {
		return { sessions: await this.registry.list(admin.id, request.sessionID) };
	}

	@Post("sessions/revoke")
	@HttpCode(HttpStatus.OK)
	@AuditAction("auth.sessions_revoke", { metadata: (result) => ({ revoked: (result as RevokeData).revoked }) })
	@ResponseMessage("Sessions revoked")
	async revokeSessions(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SessionRevokeDto, @Req() request: Request): Promise<RevokeData> {
		const revoked =
			dto.sessionId === undefined
				? await this.registry.revokeOthers(admin.id, request.sessionID)
				: await this.registry.revokeOne(admin.id, dto.sessionId);

		return { revoked };
	}
}

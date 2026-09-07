import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { MfaStatus, RecoveryCodes, TotpEnrollment } from "@snapshot/contracts";
import type { Request } from "express";

import { AuditAction } from "../../common/decorators/audit.decorator.js";
import { CurrentAdmin } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { REAUTHENTICATION_ATTEMPT_LIMIT } from "./auth.constants.js";
import type { AuthAdmin } from "./auth.types.js";
import { AuthThrottle, authenticatedIdentity } from "./auth-throttle.decorator.js";
import { MfaDisableDto, PasswordConfirmDto, RecoveryCodesRegenerateDto, TotpEnableDto } from "./mfa.dto.js";
import { MfaService } from "./mfa.service.js";
import { SessionManagerService } from "./session-manager.service.js";
import { SessionRegistryService } from "./session-registry.service.js";

@Controller("auth/mfa")
export class MfaController {
	constructor(
		private readonly mfa: MfaService,
		private readonly sessions: SessionManagerService,
		private readonly registry: SessionRegistryService,
	) {}

	@Get()
	@ResponseMessage("Two-factor status")
	status(@CurrentAdmin() admin: AuthAdmin): Promise<MfaStatus> {
		return this.mfa.status(admin.id);
	}

	@Post("setup")
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("mfa.setup")
	@ResponseMessage("Scan the key with your authenticator app")
	setup(@CurrentAdmin() admin: AuthAdmin, @Body() dto: PasswordConfirmDto): Promise<TotpEnrollment> {
		return this.mfa.beginEnrollment(admin.id, dto.currentPassword);
	}

	@Delete("setup")
	@HttpCode(HttpStatus.OK)
	@AuditAction("mfa.setup_cancel")
	@ResponseMessage("Setup discarded")
	async cancelSetup(@CurrentAdmin() admin: AuthAdmin): Promise<null> {
		await this.mfa.cancelEnrollment(admin.id);

		return null;
	}

	@Post("enable")
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("mfa.enable")
	@ResponseMessage("Two-factor authentication enabled")
	async enable(@CurrentAdmin() admin: AuthAdmin, @Body() dto: TotpEnableDto, @Req() request: Request): Promise<RecoveryCodes> {
		const codes = await this.mfa.enable(admin.id, dto.code, dto.label);
		await this.secureChangedFactor(admin, request);

		return codes;
	}

	@Post("disable")
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("mfa.disable")
	@ResponseMessage("Two-factor authentication disabled")
	async disable(@CurrentAdmin() admin: AuthAdmin, @Body() dto: MfaDisableDto, @Req() request: Request): Promise<null> {
		await this.mfa.disable(admin.id, dto.currentPassword, dto.code);
		await this.secureChangedFactor(admin, request);

		return null;
	}

	@Post("recovery-codes")
	@HttpCode(HttpStatus.OK)
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("mfa.recovery_codes_rotate")
	@ResponseMessage("New recovery codes issued")
	async regenerate(
		@CurrentAdmin() admin: AuthAdmin,
		@Body() dto: RecoveryCodesRegenerateDto,
		@Req() request: Request,
	): Promise<RecoveryCodes> {
		const codes = await this.mfa.regenerateRecoveryCodes(admin.id, dto.currentPassword, dto.code);
		await this.secureChangedFactor(admin, request);

		return codes;
	}

	private async secureChangedFactor(admin: AuthAdmin, request: Request): Promise<void> {
		await this.registry.revokeOthers(admin.id, request.sessionID);
		await this.sessions.rotate(request, admin);
	}
}

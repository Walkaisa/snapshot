import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { AccountView } from "@snapshot/contracts";

import { AuditAction, requestBody } from "../../common/decorators/audit.decorator.js";
import { CurrentAdmin } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { REAUTHENTICATION_ATTEMPT_LIMIT } from "../auth/auth.constants.js";
import type { AuthAdmin } from "../auth/auth.types.js";
import { AuthThrottle, authenticatedIdentity } from "../auth/auth-throttle.decorator.js";
import { PreferencesUpdateDto, UsernameChangeDto } from "./account.dto.js";
import { AccountService } from "./account.service.js";

@Controller("account")
export class AccountController {
	constructor(private readonly account: AccountService) {}

	@Patch("username")
	@UseGuards(ThrottlerGuard)
	@AuthThrottle(REAUTHENTICATION_ATTEMPT_LIMIT, authenticatedIdentity)
	@AuditAction("account.username_change", { metadata: (_result, request) => requestBody(request) })
	@ResponseMessage("Username updated")
	async changeUsername(@CurrentAdmin() admin: AuthAdmin, @Body() dto: UsernameChangeDto): Promise<AccountView> {
		return this.account.changeUsername(admin.id, dto.currentPassword, dto.username);
	}

	@Patch("preferences")
	@AuditAction("account.preferences_update", { metadata: (_result, request) => requestBody(request) })
	@ResponseMessage("Preferences updated")
	async updatePreferences(@CurrentAdmin() admin: AuthAdmin, @Body() dto: PreferencesUpdateDto): Promise<AccountView> {
		return this.account.updatePreferences(admin.id, dto);
	}
}

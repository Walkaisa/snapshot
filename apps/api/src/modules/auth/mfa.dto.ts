import {
	mfaDisableRequestSchema,
	mfaVerifyRequestSchema,
	passwordConfirmRequestSchema,
	recoveryCodesRegenerateRequestSchema,
	totpEnableRequestSchema,
} from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class PasswordConfirmDto extends createZodDto(passwordConfirmRequestSchema) {}
export class TotpEnableDto extends createZodDto(totpEnableRequestSchema) {}
export class MfaDisableDto extends createZodDto(mfaDisableRequestSchema) {}
export class RecoveryCodesRegenerateDto extends createZodDto(recoveryCodesRegenerateRequestSchema) {}
export class MfaVerifyDto extends createZodDto(mfaVerifyRequestSchema) {}

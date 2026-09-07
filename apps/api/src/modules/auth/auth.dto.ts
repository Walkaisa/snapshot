import { passwordChangeRequestSchema, sessionRevokeRequestSchema, setupRequestSchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class SetupDto extends createZodDto(setupRequestSchema) {}
export class PasswordChangeDto extends createZodDto(passwordChangeRequestSchema) {}
export class SessionRevokeDto extends createZodDto(sessionRevokeRequestSchema) {}

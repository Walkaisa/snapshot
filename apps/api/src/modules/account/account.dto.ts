import { preferencesUpdateSchema, usernameChangeRequestSchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class UsernameChangeDto extends createZodDto(usernameChangeRequestSchema) {}
export class PreferencesUpdateDto extends createZodDto(preferencesUpdateSchema) {}

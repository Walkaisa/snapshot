import { auditQuerySchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class AuditQueryDto extends createZodDto(auditQuerySchema) {}

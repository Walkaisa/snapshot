import { configUpdateSchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class ConfigUpdateDto extends createZodDto(configUpdateSchema) {}

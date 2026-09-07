import { linkCreateSchema, linkListQuerySchema, linkUpdateSchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class LinkCreateDto extends createZodDto(linkCreateSchema) {}
export class LinkUpdateDto extends createZodDto(linkUpdateSchema) {}
export class LinkListQueryDto extends createZodDto(linkListQuerySchema) {}

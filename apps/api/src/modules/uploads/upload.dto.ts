import { uploadListQuerySchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class UploadListQueryDto extends createZodDto(uploadListQuerySchema) {}

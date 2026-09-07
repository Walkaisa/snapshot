import { statsRangeQuerySchema } from "@snapshot/contracts";
import { createZodDto } from "nestjs-zod";

export class StatsRangeQueryDto extends createZodDto(statsRangeQuerySchema) {}

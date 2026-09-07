import type { z } from "zod";

export type ZodFields<TValues> = { [K in keyof TValues]: z.ZodType<TValues[K], unknown> };

import { z } from "zod";

import { publicLinkSchema } from "./links.js";
import { publicUploadSchema } from "./uploads.js";

export const resolvedIdSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("upload"), upload: publicUploadSchema }),
	z.object({ kind: z.literal("link"), link: publicLinkSchema }),
]);
export type ResolvedId = z.infer<typeof resolvedIdSchema>;

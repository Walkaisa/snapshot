import { z } from "zod";

export const errorCodeSchema = z.enum([
	"unauthorized",
	"forbidden",
	"conflict",
	"not_found",
	"validation_error",
	"internal_server_error",
	"rate_limit_exceeded",
	"file_empty",
	"file_not_found",
	"link_not_found",
	"slug_unavailable",
	"file_too_large",
	"storage_limit_reached",
	"invalid_content_type",
	"invalid_file_type",
	"missing_filename",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const sortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
	z.object({
		success: z.literal(true),
		status: z.literal("success"),
		message: z.string(),
		data,
	});

export const apiErrorSchema = z.object({
	success: z.literal(false),
	status: z.literal("error"),
	message: z.string(),
	data: z.object({
		errorCode: errorCodeSchema,
		requestId: z.string(),
		details: z.unknown().optional(),
	}),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

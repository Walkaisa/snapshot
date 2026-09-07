import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiErrorSchema, apiSuccessSchema, errorCodeSchema } from "../src/common.js";

describe("envelopes", () => {
	it("wraps a payload schema in the success envelope", () => {
		const schema = apiSuccessSchema(z.object({ ok: z.boolean() }));
		const parsed = schema.parse({
			success: true,
			status: "success",
			message: "Done",
			data: { ok: true },
		});
		expect(parsed.data.ok).toBe(true);
	});

	it("parses the error envelope", () => {
		const parsed = apiErrorSchema.parse({
			success: false,
			status: "error",
			message: "Unauthorized",
			data: { errorCode: "unauthorized", requestId: "req-1" },
		});
		expect(parsed.data.errorCode).toBe("unauthorized");
	});

	it("rejects unknown error codes", () => {
		expect(errorCodeSchema.safeParse("nope").success).toBe(false);
	});
});

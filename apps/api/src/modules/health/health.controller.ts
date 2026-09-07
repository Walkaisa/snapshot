import { Controller, Get } from "@nestjs/common";

import { Public } from "../../common/decorators/auth.decorator.js";
import { SkipEnvelope } from "../../common/decorators/response.decorator.js";

@Controller("healthz")
export class HealthController {
	@Get()
	@Public()
	@SkipEnvelope()
	check(): { status: "ok" } {
		return { status: "ok" };
	}
}

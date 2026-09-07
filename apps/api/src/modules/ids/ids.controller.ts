import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import { type IdAvailability, idSchema } from "@snapshot/contracts";

import { Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { AppException } from "../../common/exceptions/app.exception.js";
import { SessionOrApiKeyGuard } from "../auth/guards/session-or-api-key.guard.js";
import { IdAllocatorService } from "./id-allocator.service.js";

@Controller("ids")
@Public()
@UseGuards(SessionOrApiKeyGuard)
export class IdsController {
	constructor(private readonly ids: IdAllocatorService) {}

	@Get(":id")
	@ResponseMessage("Id availability")
	async availability(@Param("id") id: string): Promise<IdAvailability> {
		const parsed = idSchema.safeParse(id);

		if (!parsed.success) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Not a usable id", "validation_error");
		}

		const occupiedBy = await this.ids.occupantOf(parsed.data);

		return { id: parsed.data, available: occupiedBy === null, occupiedBy };
	}
}

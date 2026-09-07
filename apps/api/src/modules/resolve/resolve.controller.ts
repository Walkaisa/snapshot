import { Controller, Get, Param, Req } from "@nestjs/common";
import type { ResolvedId } from "@snapshot/contracts";
import type { Request } from "express";

import { Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { ResolveService } from "./resolve.service.js";

@Controller("resolve")
export class ResolveController {
	constructor(private readonly resolver: ResolveService) {}

	@Get(":id")
	@Public()
	@ResponseMessage("Resolved share id")
	resolve(@Param("id") id: string, @Req() request: Request): Promise<ResolvedId> {
		return this.resolver.resolve(id, request);
	}
}

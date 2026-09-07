import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { Link, LinkDeleteData, LinkList } from "@snapshot/contracts";

import { AuditAction, routeParam } from "../../common/decorators/audit.decorator.js";
import { Public } from "../../common/decorators/auth.decorator.js";
import { ResponseMessage } from "../../common/decorators/response.decorator.js";
import { WriteRateLimitGuard } from "../../common/guards/write-rate-limit.guard.js";
import { SessionOrApiKeyGuard } from "../auth/guards/session-or-api-key.guard.js";
import { LinkCreateDto, LinkListQueryDto, LinkUpdateDto } from "./link.dto.js";
import { LinkService } from "./link.service.js";
import { hostOf } from "./link-host.js";

@Controller("links")
@Public()
@UseGuards(SessionOrApiKeyGuard)
export class LinksController {
	constructor(private readonly links: LinkService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(WriteRateLimitGuard)
	@AuditAction("links.create", {
		id: (result) => (result as Link).slug,
		metadata: (result) => ({
			shortUrl: (result as Link).shortUrl,
			target: (result as Link).targetUrl,
			host: hostOf((result as Link).targetUrl),
		}),
	})
	@ResponseMessage("Short link created")
	create(@Body() dto: LinkCreateDto): Promise<Link> {
		return this.links.create(dto);
	}

	@Get()
	@ResponseMessage("Short links returned")
	list(@Query() query: LinkListQueryDto): Promise<LinkList> {
		return this.links.list(query);
	}

	@Get(":slug")
	@ResponseMessage("Short link")
	get(@Param("slug") slug: string): Promise<Link> {
		return this.links.get(slug);
	}

	@Patch(":slug")
	@AuditAction("links.update", {
		id: (_result, request) => routeParam(request, "slug"),
		metadata: (result) => ({
			shortUrl: (result as Link).shortUrl,
			target: (result as Link).targetUrl,
			host: hostOf((result as Link).targetUrl),
		}),
	})
	@ResponseMessage("Short link updated")
	update(@Param("slug") slug: string, @Body() dto: LinkUpdateDto): Promise<Link> {
		return this.links.update(slug, dto);
	}

	@Delete(":slug")
	@HttpCode(HttpStatus.OK)
	@AuditAction("links.delete", {
		id: (_result, request) => routeParam(request, "slug"),
		metadata: (result) => ({ slug: (result as LinkDeleteData).slug }),
	})
	@ResponseMessage("Short link deleted")
	delete(@Param("slug") slug: string): Promise<LinkDeleteData> {
		return this.links.delete(slug);
	}
}

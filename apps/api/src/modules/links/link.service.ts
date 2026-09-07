import { HttpStatus, Injectable } from "@nestjs/common";
import type { Link, LinkCreate, LinkList, LinkListQuery, LinkUpdate, PublicLink } from "@snapshot/contracts";
import { idShapeFor, publicLinkSchema } from "@snapshot/contracts";
import type { Request } from "express";

import { AppException } from "../../common/exceptions/app.exception.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { type LinkRecord, LinkRepository } from "../../db/repositories/link.repository.js";
import { LinkVisitRepository } from "../../db/repositories/link-visit.repository.js";
import { CacheService } from "../../redis/cache.service.js";
import { redisKeys } from "../../redis/redis.constants.js";
import { IdAllocatorService } from "../ids/id-allocator.service.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";
import { toLink, toPublicLink } from "./link-mapper.js";
import { LinkVisitTrackerService } from "./link-visit-tracker.service.js";

@Injectable()
export class LinkService {
	constructor(
		private readonly links: LinkRepository,
		private readonly visits: LinkVisitRepository,
		private readonly ids: IdAllocatorService,
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly visitTracker: LinkVisitTrackerService,
		private readonly cache: CacheService,
		private readonly config: AppConfigService,
	) {}

	private get baseUrl(): string {
		return this.config.env.BASE_URL;
	}

	async create(input: LinkCreate): Promise<Link> {
		const slug = input.slug === undefined ? await this.allocateSlug() : await this.claimSlug(input.slug);
		const record: LinkRecord = { slug, targetUrl: input.url, createdAt: new Date() };

		if (!(await this.links.insert(record))) {
			throw new AppException(HttpStatus.CONFLICT, `The id "${slug}" is already in use`, "slug_unavailable");
		}

		return toLink(record, this.baseUrl, 0);
	}

	async list(query: LinkListQuery): Promise<LinkList> {
		const [rows, total] = await Promise.all([
			this.links.list({
				offset: (query.page - 1) * query.perPage,
				limit: query.perPage,
				sort: query.sort,
				order: query.order,
				search: query.search,
			}),
			this.links.count(query.search),
		]);

		return {
			items: rows.map((row) => toLink(row, this.baseUrl, row.visits)),
			total,
			page: query.page,
			perPage: query.perPage,
		};
	}

	async get(slug: string): Promise<Link> {
		const record = await this.requireRecord(slug);

		return toLink(record, this.baseUrl, await this.visits.countFor(slug));
	}

	async update(slug: string, input: LinkUpdate): Promise<Link> {
		const record = await this.links.updateTarget(slug, input.url);

		if (record === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "Short link not found", "link_not_found");
		}

		await this.cache.del(redisKeys.link(slug));

		return toLink(record, this.baseUrl, await this.visits.countFor(slug));
	}

	async delete(slug: string): Promise<{ slug: string }> {
		if (!(await this.links.deleteBySlug(slug))) {
			throw new AppException(HttpStatus.NOT_FOUND, "Short link not found", "link_not_found");
		}

		await this.cache.del(redisKeys.link(slug));

		return { slug };
	}

	async resolve(slug: string, request: Request): Promise<PublicLink | null> {
		const link = await this.lookup(slug);

		if (link === null) {
			return null;
		}

		this.visitTracker.track(link.slug, request);

		return link;
	}

	private async lookup(slug: string): Promise<PublicLink | null> {
		const cached = publicLinkSchema.safeParse(await this.cache.getJson<unknown>(redisKeys.link(slug)));

		if (cached.success) {
			return cached.data;
		}

		const record = await this.links.findBySlug(slug);

		if (record === null) {
			return null;
		}

		const link = toPublicLink(record);
		await this.cache.setJson(redisKeys.link(slug), link);

		return link;
	}

	private async allocateSlug(): Promise<string> {
		const config = await this.runtimeConfig.get();

		return await this.ids.allocate(idShapeFor(config, "link"));
	}

	private async claimSlug(slug: string): Promise<string> {
		await this.ids.assertAvailable(slug);

		return slug;
	}

	private async requireRecord(slug: string): Promise<LinkRecord> {
		const record = await this.links.findBySlug(slug);

		if (record === null) {
			throw new AppException(HttpStatus.NOT_FOUND, "Short link not found", "link_not_found");
		}

		return record;
	}
}

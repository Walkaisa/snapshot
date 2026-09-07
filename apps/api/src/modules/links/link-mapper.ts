import type { Link, PublicLink } from "@snapshot/contracts";

import type { LinkRecord } from "../../db/repositories/link.repository.js";

export function toLink(record: LinkRecord, baseUrl: string, visits: number): Link {
	return {
		slug: record.slug,
		targetUrl: record.targetUrl,
		visits,
		createdAt: record.createdAt.toISOString(),
		shortUrl: `${baseUrl}/${record.slug}`,
		deleteUrl: `${baseUrl}/api/links/${record.slug}`,
	};
}

export function toPublicLink(record: LinkRecord): PublicLink {
	return { slug: record.slug, targetUrl: record.targetUrl };
}

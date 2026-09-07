import { idSchema, type PublicUpload, type ResolvedId } from "@snapshot/contracts";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

import { LinkRedirect } from "@/components/links/link-redirect";
import { SharePreview } from "@/components/share/share-preview";
import { ShareSidebar } from "@/components/share/share-sidebar";
import { serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/types";
import { shareMetadata } from "@/lib/share-metadata";

const VISITOR_HEADERS = ["x-forwarded-for", "user-agent", "referer"] as const;

const resolveId = cache(async (id: string): Promise<ResolvedId | null> => {
	if (!idSchema.safeParse(id).success) {
		return null;
	}

	const incoming = await headers();
	const forwarded: Record<string, string> = {};

	for (const name of VISITOR_HEADERS) {
		const value = incoming.get(name);

		if (value !== null) {
			forwarded[name] = value;
		}
	}

	try {
		return await serverApi<ResolvedId>(`/api/resolve/${encodeURIComponent(id)}`, { headers: forwarded });
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null;
		}

		throw error;
	}
});

async function getUpload(id: string): Promise<PublicUpload | null> {
	const resolved = await resolveId(id);

	return resolved?.kind === "upload" ? resolved.upload : null;
}

export async function generateViewport({ params }: { params: Promise<{ id: string }> }): Promise<Viewport> {
	const { id } = await params;
	const upload = await getUpload(id);

	return upload?.embed.enabled === true ? { themeColor: upload.embed.themeColor } : {};
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const resolved = await resolveId(id);

	if (resolved?.kind === "upload") {
		return shareMetadata(resolved.upload);
	}

	const t = await getTranslations(resolved === null ? "share.notFound" : "share.redirect");

	return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolveId(id);

	if (resolved === null) {
		notFound();
	}

	if (resolved.kind === "link") {
		return <LinkRedirect link={resolved.link} />;
	}

	return (
		<div className="flex min-h-svh flex-col lg:flex-row">
			<SharePreview upload={resolved.upload} />
			<ShareSidebar upload={resolved.upload} />
		</div>
	);
}

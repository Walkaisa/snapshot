import { type NextRequest, NextResponse } from "next/server";

import { type AuthState, resolveGateRedirect } from "@/lib/auth-gate";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

async function fetchAuthState(request: NextRequest): Promise<AuthState> {
	try {
		const response = await fetch(`${API_INTERNAL_URL}/api/auth/state`, {
			headers: { cookie: request.headers.get("cookie") ?? "" },
			cache: "no-store",
		});
		const body = (await response.json()) as { data?: AuthState };

		return body.data ?? { initialized: false, authenticated: false };
	} catch {
		return { initialized: false, authenticated: false };
	}
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
	const state = await fetchAuthState(request);
	const target = resolveGateRedirect({ pathname: request.nextUrl.pathname, search: request.nextUrl.search }, state);

	return target === null ? NextResponse.next() : NextResponse.redirect(new URL(target, request.url));
}

export const config = {
	matcher: [
		"/",
		"/sign-in",
		"/setup",
		"/overview",
		"/gallery",
		"/links",
		"/audit",
		"/uploads",
		"/shortener",
		"/rate-limit",
		"/sharex",
		"/api-key",
		"/profile",
		"/security",
		"/appearance",
	],
};

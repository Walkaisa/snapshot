export interface AuthState {
	initialized: boolean;
	authenticated: boolean;
}

export interface GateLocation {
	pathname: string;
	search?: string;
}

export const AUTH_REDIRECT_PARAM = "next";

export const AUTH_PAGES = ["/sign-in", "/setup"] as const;

export const DASHBOARD_ROUTES = [
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
] as const;

export const DEFAULT_LANDING = "/overview";

function isDashboardRoute(pathname: string): boolean {
	return (DASHBOARD_ROUTES as readonly string[]).includes(pathname);
}

function isAuthPage(pathname: string): boolean {
	return (AUTH_PAGES as readonly string[]).includes(pathname);
}

export function safeRedirectTarget(target: string | null | undefined): string | null {
	if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
		return null;
	}

	const [pathname = ""] = target.split(/[?#]/, 1);

	return isDashboardRoute(pathname) ? target : null;
}

function withRedirect(destination: string, target: string | null): string {
	if (target === null) {
		return destination;
	}

	return `${destination}?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(target)}`;
}

function requestedTarget(location: GateLocation): string | null {
	return safeRedirectTarget(`${location.pathname}${location.search ?? ""}`);
}

function carriedTarget(location: GateLocation): string | null {
	return safeRedirectTarget(new URLSearchParams(location.search ?? "").get(AUTH_REDIRECT_PARAM));
}

export function resolveGateRedirect(location: GateLocation, state: AuthState): string | null {
	const { initialized, authenticated } = state;
	const { pathname } = location;

	if (pathname === "/") {
		if (authenticated) {
			return DEFAULT_LANDING;
		}
		return initialized ? "/sign-in" : "/setup";
	}

	if (isDashboardRoute(pathname)) {
		if (authenticated) {
			return null;
		}

		return withRedirect(initialized ? "/sign-in" : "/setup", requestedTarget(location));
	}

	if (isAuthPage(pathname)) {
		if (authenticated) {
			return carriedTarget(location) ?? DEFAULT_LANDING;
		}
		if (!initialized && pathname !== "/setup") {
			return withRedirect("/setup", carriedTarget(location));
		}
		if (initialized && pathname === "/setup") {
			return withRedirect("/sign-in", carriedTarget(location));
		}
		return null;
	}

	return null;
}

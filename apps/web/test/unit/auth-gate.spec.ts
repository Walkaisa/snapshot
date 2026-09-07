import { RESERVED_IDS } from "@snapshot/contracts";
import { describe, expect, it } from "vitest";

import { navItems } from "@/components/layout/nav-items";
import { AUTH_PAGES, AUTH_REDIRECT_PARAM, DASHBOARD_ROUTES, resolveGateRedirect, safeRedirectTarget } from "@/lib/auth-gate";
import { config } from "@/proxy";

const uninitialized = { initialized: false, authenticated: false };
const guest = { initialized: true, authenticated: false };
const authed = { initialized: true, authenticated: true };

const at = (pathname: string, search = "") => ({ pathname, search });

describe("resolveGateRedirect", () => {
	it("routes the root by state", () => {
		expect(resolveGateRedirect(at("/"), uninitialized)).toBe("/setup");
		expect(resolveGateRedirect(at("/"), guest)).toBe("/sign-in");
		expect(resolveGateRedirect(at("/"), authed)).toBe("/overview");
	});

	it("protects every dashboard route", () => {
		for (const route of DASHBOARD_ROUTES) {
			expect(resolveGateRedirect(at(route), authed)).toBeNull();
			expect(resolveGateRedirect(at(route), guest)).toBe(`/sign-in?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(route)}`);
			expect(resolveGateRedirect(at(route), uninitialized)).toBe(`/setup?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(route)}`);
		}
	});

	it("keeps the query string of the route that was asked for", () => {
		expect(resolveGateRedirect(at("/gallery", "?page=2"), guest)).toBe(
			`/sign-in?${AUTH_REDIRECT_PARAM}=${encodeURIComponent("/gallery?page=2")}`,
		);
	});

	it("hands a signed-in visitor back to where they were going", () => {
		expect(resolveGateRedirect(at("/sign-in", `?${AUTH_REDIRECT_PARAM}=%2Fgallery`), authed)).toBe("/gallery");
		expect(resolveGateRedirect(at("/setup", `?${AUTH_REDIRECT_PARAM}=%2Flinks`), authed)).toBe("/links");
	});

	it("falls back to the landing page without a usable target", () => {
		expect(resolveGateRedirect(at("/sign-in"), authed)).toBe("/overview");
		expect(resolveGateRedirect(at("/sign-in", `?${AUTH_REDIRECT_PARAM}=https%3A%2F%2Fevil.example`), authed)).toBe("/overview");
	});

	it("carries the target across a bounce between the auth pages", () => {
		expect(resolveGateRedirect(at("/sign-in", `?${AUTH_REDIRECT_PARAM}=%2Flinks`), uninitialized)).toBe(
			`/setup?${AUTH_REDIRECT_PARAM}=${encodeURIComponent("/links")}`,
		);
		expect(resolveGateRedirect(at("/setup", `?${AUTH_REDIRECT_PARAM}=%2Flinks`), guest)).toBe(
			`/sign-in?${AUTH_REDIRECT_PARAM}=${encodeURIComponent("/links")}`,
		);
	});

	it("handles the auth pages without a target", () => {
		expect(resolveGateRedirect(at("/sign-in"), uninitialized)).toBe("/setup");
		expect(resolveGateRedirect(at("/setup"), guest)).toBe("/sign-in");
		expect(resolveGateRedirect(at("/sign-in"), guest)).toBeNull();
		expect(resolveGateRedirect(at("/setup"), uninitialized)).toBeNull();
	});

	it("ignores unknown paths (e.g. public share pages)", () => {
		expect(resolveGateRedirect(at("/abc123XYZ"), guest)).toBeNull();
	});
});

describe("safeRedirectTarget", () => {
	it("accepts a gated dashboard route, with or without a query", () => {
		expect(safeRedirectTarget("/overview")).toBe("/overview");
		expect(safeRedirectTarget("/gallery?page=2")).toBe("/gallery?page=2");
		expect(safeRedirectTarget("/links#top")).toBe("/links#top");
	});

	it.each([
		"https://evil.example/overview",
		"//evil.example",
		"/\\evil.example",
		"http://localhost:3000/overview",
		"/abc123XYZ",
		"/sign-in",
		"overview",
		"",
	])("refuses %j", (target) => {
		expect(safeRedirectTarget(target)).toBeNull();
	});

	it("refuses a missing target", () => {
		expect(safeRedirectTarget(null)).toBeNull();
		expect(safeRedirectTarget(undefined)).toBeNull();
	});
});

describe("proxy matcher", () => {
	it("covers the root, every auth page and every dashboard route", () => {
		for (const route of ["/", ...AUTH_PAGES, ...DASHBOARD_ROUTES]) {
			expect(config.matcher).toContain(route);
		}
	});
});

describe("reserved ids", () => {
	it("reserves every web route slug", () => {
		for (const route of [...AUTH_PAGES, ...DASHBOARD_ROUTES]) {
			expect(RESERVED_IDS).toContain(route.slice(1));
		}
	});
});

describe("sidebar navigation", () => {
	it("links only to gated dashboard routes", () => {
		for (const item of navItems) {
			expect(DASHBOARD_ROUTES).toContain(item.href);
		}
	});

	it("reaches every dashboard route", () => {
		const linked = navItems.map((item) => item.href);

		for (const route of DASHBOARD_ROUTES) {
			expect(linked).toContain(route);
		}
	});
});

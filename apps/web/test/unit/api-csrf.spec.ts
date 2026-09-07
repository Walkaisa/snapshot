import type { SessionData } from "@snapshot/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchSession, setupAdmin } from "@/lib/api/auth";
import { clientApi, resetCsrfToken } from "@/lib/api/client";

const fetchMock = vi.fn<typeof fetch>();
const originalFetch = globalThis.fetch;

function envelope(data: unknown): Response {
	return new Response(JSON.stringify({ success: true, status: "success", message: "ok", data }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

function session(csrfToken: string): SessionData {
	return { username: "admin", csrfToken, theme: "system", locale: "system" };
}

function requestedPaths(): string[] {
	return fetchMock.mock.calls.map(([input]) => String(input));
}

function tokenOfCall(index: number): string | null {
	return new Headers(fetchMock.mock.calls[index]?.[1]?.headers).get("x-csrf-token");
}

describe("clientApi csrf token", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		resetCsrfToken();
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("keeps the token setup issued, so the next mutation is not rejected", async () => {
		fetchMock
			.mockResolvedValueOnce(envelope({ csrfToken: "anonymous-token" }))
			.mockResolvedValueOnce(envelope(session("rotated-token")))
			.mockResolvedValueOnce(envelope(null));

		await setupAdmin({ username: "admin", password: "a-really-strong-password" });
		await clientApi("/api/auth/mfa/setup", { method: "POST", body: "{}" });

		expect(requestedPaths()).toEqual(["/api/auth/csrf", "/api/auth/setup", "/api/auth/mfa/setup"]);
		expect(tokenOfCall(2)).toBe("rotated-token");
	});

	it("adopts the token a session read reports", async () => {
		fetchMock.mockResolvedValueOnce(envelope(session("session-token"))).mockResolvedValueOnce(envelope(null));

		await fetchSession();
		await clientApi("/api/auth/mfa/setup", { method: "POST", body: "{}" });

		expect(requestedPaths()).toEqual(["/api/auth/session", "/api/auth/mfa/setup"]);
		expect(tokenOfCall(1)).toBe("session-token");
	});
});

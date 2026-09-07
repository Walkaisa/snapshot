import { expect, request } from "@playwright/test";

export const ADMIN = {
	username: process.env.E2E_USERNAME ?? "e2e-admin",
	password: process.env.E2E_PASSWORD ?? "E2ePassword123!",
};

export async function apiContext(baseURL: string) {
	return await request.newContext({ baseURL, ignoreHTTPSErrors: true });
}

export async function ensureAdmin(baseURL: string): Promise<void> {
	const api = await apiContext(baseURL);

	try {
		const state = await (await api.get("/api/auth/state")).json();

		if (state.data.initialized === true) {
			return;
		}

		const csrf = await (await api.get("/api/auth/csrf")).json();
		const response = await api.post("/api/auth/setup", {
			headers: { "x-csrf-token": csrf.data.csrfToken },
			data: ADMIN,
		});

		expect(response.status(), "setup should create the admin").toBe(201);
	} finally {
		await api.dispose();
	}
}

export async function fetchApiKey(baseURL: string): Promise<string> {
	const api = await apiContext(baseURL);

	try {
		const csrf = await (await api.get("/api/auth/csrf")).json();
		const signIn = await api.post("/api/auth/sign-in", {
			headers: { "x-csrf-token": csrf.data.csrfToken },
			data: ADMIN,
		});

		expect(signIn.status(), "E2E needs a stack whose admin matches E2E_USERNAME/E2E_PASSWORD").toBe(200);

		const key = await (await api.get("/api/api-key")).json();

		return key.data.apiKey as string;
	} finally {
		await api.dispose();
	}
}

export const PNG_WIDTH = 4;
export const PNG_HEIGHT = 2;
export const PNG_4X2 = Buffer.from(
	"89504e470d0a1a0a0000000d4948445200000004000000020802000000f0caea3400000009704859730000000100000001" +
		"004f25c4d60000001049444154789c63f8cbc000470cc81c006eca07e96e0687760000000049454e44ae426082",
	"hex",
);

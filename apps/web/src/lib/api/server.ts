import { cookies } from "next/headers";

import { request } from "./fetcher";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
	const cookieHeader = (await cookies()).toString();

	return request<T>(`${API_INTERNAL_URL}${path}`, {
		...init,
		headers: { ...init.headers, cookie: cookieHeader },
		cache: "no-store",
	});
}

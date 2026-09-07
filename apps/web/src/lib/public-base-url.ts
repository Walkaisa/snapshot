export function publicBaseUrl(): string {
	return (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

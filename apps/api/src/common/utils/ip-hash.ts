import { createHash } from "node:crypto";

export function hashIp(ip: string | undefined | null, pepper: string, now = new Date()): string | null {
	if (!ip) {
		return null;
	}

	const day = now.toISOString().slice(0, 10);

	return createHash("sha256").update(`${ip}|${day}|${pepper}`).digest("hex");
}

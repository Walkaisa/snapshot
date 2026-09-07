import { describe, expect, it } from "vitest";

import { absoluteSessionExpired } from "../../../src/modules/auth/session-manager.service.js";

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.parse("2026-09-04T12:00:00.000Z");

describe("absoluteSessionExpired", () => {
	it("keeps a session inside its absolute lifetime", () => {
		expect(absoluteSessionExpired("2026-09-01T12:00:00.000Z", 7 * 24 * HOUR_MS, NOW)).toBe(false);
	});

	it("expires a session at the absolute boundary", () => {
		expect(absoluteSessionExpired("2026-08-28T12:00:00.000Z", 7 * 24 * HOUR_MS, NOW)).toBe(true);
	});

	it.each([undefined, "not-a-date", "2026-09-05T12:00:00.000Z"])("fails closed for an invalid start time: %s", (createdAt) => {
		expect(absoluteSessionExpired(createdAt, 7 * 24 * HOUR_MS, NOW)).toBe(true);
	});
});

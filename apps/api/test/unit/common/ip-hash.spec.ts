import { describe, expect, it } from "vitest";

import { hashIp } from "../../../src/common/utils/ip-hash.js";

const day = new Date("2026-07-11T09:00:00Z");
const otherDay = new Date("2026-07-12T09:00:00Z");

describe("hashIp", () => {
	it("returns null when there is no ip", () => {
		expect(hashIp(null, "pepper")).toBeNull();
		expect(hashIp(undefined, "pepper")).toBeNull();
	});

	it("produces a stable 64-char hash for the same ip, pepper and day", () => {
		const first = hashIp("203.0.113.7", "pepper", day);
		const second = hashIp("203.0.113.7", "pepper", day);

		expect(first).toBe(second);
		expect(first).toMatch(/^[a-f0-9]{64}$/);
	});

	it("never stores the raw ip", () => {
		expect(hashIp("203.0.113.7", "pepper", day)).not.toContain("203.0.113.7");
	});

	it("rotates the hash by day and by pepper", () => {
		const base = hashIp("203.0.113.7", "pepper", day);

		expect(hashIp("203.0.113.7", "pepper", otherDay)).not.toBe(base);
		expect(hashIp("203.0.113.7", "other-pepper", day)).not.toBe(base);
	});
});

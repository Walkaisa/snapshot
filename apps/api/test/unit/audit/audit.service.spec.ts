import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditWrite } from "../../../src/db/repositories/audit.repository.js";

import { AuditService } from "../../../src/modules/audit/audit.service.js";

function serviceWith(insertMany: (writes: AuditWrite[]) => Promise<void>) {
	return new AuditService({ insertMany } as never);
}

describe("AuditService", () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it("resolves the severity from the action table", async () => {
		const written: AuditWrite[] = [];
		const service = serviceWith(async (writes) => {
			written.push(...writes);
		});

		service.record({ action: "uploads.create", targetId: "abc123" });
		service.record({ action: "auth.sign_in", outcome: "failure" });
		await service.flush();

		expect(written.map((entry) => entry.severity)).toEqual(["info", "warning"]);
		expect(written[0]?.targetType).toBe("upload");
	});

	it("defaults the actor to the system", async () => {
		const written: AuditWrite[] = [];
		const service = serviceWith(async (writes) => {
			written.push(...writes);
		});

		service.record({ action: "system.startup" });
		await service.flush();

		expect(written[0]?.actor).toBe("system");
	});

	it("buffers instead of writing on every call", () => {
		const insertMany = vi.fn().mockResolvedValue(undefined);
		const service = serviceWith(insertMany);

		service.record({ action: "uploads.create" });
		service.record({ action: "uploads.create" });

		expect(insertMany).not.toHaveBeenCalled();
	});

	it("flushes an error-severity entry without waiting", async () => {
		const insertMany = vi.fn().mockResolvedValue(undefined);
		const service = serviceWith(insertMany);

		service.record({ action: "system.audit_overflow", outcome: "failure" });
		await service.flush();

		expect(insertMany).toHaveBeenCalled();
	});

	it("redacts metadata on the way in", async () => {
		const written: AuditWrite[] = [];
		const service = serviceWith(async (writes) => {
			written.push(...writes);
		});

		service.record({ action: "config.update", metadata: { apiKey: "leak", changed: ["embedEnabled"] } });
		await service.flush();

		expect(written[0]?.metadata).toEqual({ apiKey: "[redacted]", changed: ["embedEnabled"] });
	});

	it("records an overflow marker once the buffer is exhausted", async () => {
		const written: AuditWrite[] = [];
		const service = serviceWith(async (writes) => {
			written.push(...writes);
		});

		for (let index = 0; index < 1100; index += 1) {
			service.record({ action: "uploads.create" });
		}

		await service.flush();

		const overflow = written.find((entry) => entry.action === "system.audit_overflow");

		expect(written.filter((entry) => entry.action === "uploads.create")).toHaveLength(1000);
		expect(overflow?.metadata).toEqual({ dropped: 100 });
	});

	it("keeps serving after the database refuses a batch", async () => {
		const insertMany = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(undefined);
		const service = serviceWith(insertMany);

		service.record({ action: "uploads.create" });
		await expect(service.flush()).resolves.toBeUndefined();

		service.record({ action: "uploads.create" });
		await service.flush();

		expect(insertMany).toHaveBeenCalledTimes(3);
	});

	it("flushes what is buffered on shutdown", async () => {
		const insertMany = vi.fn().mockResolvedValue(undefined);
		const service = serviceWith(insertMany);

		service.record({ action: "uploads.create" });
		await service.onApplicationShutdown();

		expect(insertMany).toHaveBeenCalledTimes(1);
	});
});

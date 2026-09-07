import type { IdAlphabet } from "@snapshot/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { AppException } from "../../../src/common/exceptions/app.exception.js";
import type { LinkRecord, LinkRepository } from "../../../src/db/repositories/link.repository.js";
import type { UploadRecord, UploadRepository } from "../../../src/db/repositories/upload.repository.js";
import { IdAllocatorService } from "../../../src/modules/ids/id-allocator.service.js";

const alphabet: IdAlphabet = { mode: "charsets", charsets: ["lowercase", "uppercase", "digits"] };
const shape = { alphabet, length: 10, minimums: { digits: 0, symbols: 0 } };

function fakeUploads(ids: string[]): UploadRepository {
	return {
		findById: (id: string) => Promise.resolve(ids.includes(id) ? ({ id } as UploadRecord) : null),
	} as UploadRepository;
}

function fakeLinks(slugs: string[]): LinkRepository {
	return {
		findBySlug: (slug: string) => Promise.resolve(slugs.includes(slug) ? ({ slug } as LinkRecord) : null),
	} as LinkRepository;
}

describe("IdAllocatorService", () => {
	let allocator: IdAllocatorService;

	beforeEach(() => {
		allocator = new IdAllocatorService(fakeUploads(["taken-upload"]), fakeLinks(["taken-link"]));
	});

	describe("occupantOf", () => {
		it("reports the reserved route slugs first", async () => {
			await expect(allocator.occupantOf("sign-in")).resolves.toBe("reserved");
			await expect(allocator.occupantOf("SIGN-IN")).resolves.toBe("reserved");
		});

		it("sees an id an upload already holds", async () => {
			await expect(allocator.occupantOf("taken-upload")).resolves.toBe("upload");
		});

		it("sees an id a short link already holds", async () => {
			await expect(allocator.occupantOf("taken-link")).resolves.toBe("link");
		});

		it("reports nothing for a free id", async () => {
			await expect(allocator.occupantOf("still-free")).resolves.toBeNull();
		});
	});

	describe("assertAvailable", () => {
		it("passes a free id through", async () => {
			await expect(allocator.assertAvailable("still-free")).resolves.toBeUndefined();
		});

		it.each(["taken-upload", "taken-link", "overview"])("rejects %s as a conflict", async (id) => {
			await expect(allocator.assertAvailable(id)).rejects.toMatchObject({
				errorCode: "slug_unavailable",
			});
		});
	});

	describe("allocate", () => {
		it("returns an id free across both namespaces", async () => {
			const id = await allocator.allocate(shape);

			expect(id).toHaveLength(10);
			await expect(allocator.isAvailable(id)).resolves.toBe(true);
		});

		it("honours an extra caller-supplied occupancy check", async () => {
			const rejected: string[] = [];
			const id = await allocator.allocate({ ...shape, length: 8 }, (candidate) => {
				const isFirstTry = rejected.length === 0;
				rejected.push(candidate);

				return Promise.resolve(isFirstTry);
			});

			expect(rejected.length).toBeGreaterThan(1);
			expect(id).not.toBe(rejected[0]);
		});

		it("gives up rather than looping forever when nothing is free", async () => {
			await expect(allocator.allocate({ ...shape, length: 8 }, () => Promise.resolve(true))).rejects.toBeInstanceOf(AppException);
		});
	});
});

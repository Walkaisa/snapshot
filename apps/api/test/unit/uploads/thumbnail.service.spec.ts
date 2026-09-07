import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { StorageService } from "../../../src/modules/uploads/storage.service.js";
import { ThumbnailService } from "../../../src/modules/uploads/thumbnail.service.js";

const run = promisify(execFile);

function hasFfmpeg(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

const available = hasFfmpeg();

describe.skipIf(!available)("ThumbnailService", () => {
	let root = "";
	let storage: StorageService;
	let thumbnails: ThumbnailService;

	beforeAll(async () => {
		root = await mkdtemp(path.join(tmpdir(), "snapshot-thumbs-"));
		storage = new StorageService({ env: { UPLOADS_DIR: root } } as never);
		await storage.onModuleInit();
		thumbnails = new ThumbnailService(storage);
		await thumbnails.onModuleInit();
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	async function synthesize(filename: string, args: string[]): Promise<string> {
		const target = storage.pathFor(filename);
		await run("ffmpeg", ["-y", "-loglevel", "error", ...args, target]);

		return target;
	}

	it("draws a webp still from a video", async () => {
		const source = await synthesize("clip123.mp4", [
			"-f",
			"lavfi",
			"-i",
			"testsrc=duration=3:size=1280x720:rate=10",
			"-pix_fmt",
			"yuv420p",
		]);

		expect(await thumbnails.create(source, "clip123", "video/mp4")).toBe(true);
		expect(await storage.thumbnailExists("clip123")).toBe(true);

		const written = await readFile(storage.thumbnailPathFor("clip123"));

		expect(written.subarray(0, 4).toString()).toBe("RIFF");
		expect(written.subarray(8, 12).toString()).toBe("WEBP");
	});

	it("draws a still from a GIF as well", async () => {
		const source = await synthesize("loop123.gif", ["-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=5"]);

		expect(await thumbnails.create(source, "loop123", "image/gif")).toBe(true);
		expect(await storage.thumbnailExists("loop123")).toBe(true);
	});

	it("leaves still images and documents alone", async () => {
		const source = await synthesize("shot123.png", ["-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=1", "-frames:v", "1"]);

		expect(await thumbnails.create(source, "shot123", "image/png")).toBe(false);
		expect(await storage.thumbnailExists("shot123")).toBe(false);
	});

	it("reports failure and leaves nothing behind when the file is not decodable", async () => {
		const source = storage.pathFor("broken123.mp4");
		await writeFile(source, "not a video");

		expect(await thumbnails.create(source, "broken123", "video/mp4")).toBe(false);
		expect(await storage.thumbnailExists("broken123")).toBe(false);
	});

	it("removes a thumbnail with its upload", async () => {
		const source = await synthesize("gone123.mp4", [
			"-f",
			"lavfi",
			"-i",
			"testsrc=duration=2:size=320x240:rate=5",
			"-pix_fmt",
			"yuv420p",
		]);

		await thumbnails.create(source, "gone123", "video/mp4");
		await thumbnails.remove("gone123");

		expect(await storage.thumbnailExists("gone123")).toBe(false);
	});
});

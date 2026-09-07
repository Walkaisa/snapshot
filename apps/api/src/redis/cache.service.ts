import { Inject, Injectable } from "@nestjs/common";
import type { ViewCounts, ViewType } from "@snapshot/contracts";
import type { Redis } from "ioredis";

import { REDIS, redisKeys, VIEW_TYPES } from "./redis.constants.js";

const INCREMENT_VIEW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local raw = redis.call('GET', KEYS[2])

if raw then
  local decoded, aggregate = pcall(cjson.decode, raw)

  if decoded then
    local views = aggregate['views']
    local viewType = ARGV[1]

    if views and views[viewType] ~= nil and views['total'] ~= nil then
      views[viewType] = views[viewType] + 1
      views['total'] = views['total'] + 1
      redis.call('SET', KEYS[2], cjson.encode(aggregate), 'KEEPTTL')
    end
  else
    redis.call('DEL', KEYS[2])
  end
end

return count
`;

export interface CachedUpload {
	id: string;
	extension: string;
	mimeType: string;
	sizeBytes: number;
	checksumSha256: string;
	width: number | null;
	height: number | null;
	hasThumbnail: boolean;
	createdAt: string;
}

function serialize(upload: CachedUpload): Record<string, string> {
	return {
		id: upload.id,
		extension: upload.extension,
		mimeType: upload.mimeType,
		sizeBytes: String(upload.sizeBytes),
		checksumSha256: upload.checksumSha256,
		width: upload.width === null ? "" : String(upload.width),
		height: upload.height === null ? "" : String(upload.height),
		hasThumbnail: upload.hasThumbnail ? "1" : "",
		createdAt: upload.createdAt,
	};
}

function deserialize(hash: Record<string, string>): CachedUpload | null {
	const { id, extension, mimeType, sizeBytes, checksumSha256, width, height, hasThumbnail, createdAt } = hash;

	if (!id || !extension || !mimeType || !sizeBytes || !checksumSha256 || !createdAt) {
		return null;
	}

	const parsedSizeBytes = Number(sizeBytes);
	const parsedWidth = width ? Number(width) : null;
	const parsedHeight = height ? Number(height) : null;

	if (
		!Number.isSafeInteger(parsedSizeBytes) ||
		parsedSizeBytes < 0 ||
		(parsedWidth !== null && (!Number.isSafeInteger(parsedWidth) || parsedWidth <= 0)) ||
		(parsedHeight !== null && (!Number.isSafeInteger(parsedHeight) || parsedHeight <= 0)) ||
		!Number.isFinite(Date.parse(createdAt))
	) {
		return null;
	}

	return {
		id,
		extension,
		mimeType,
		sizeBytes: parsedSizeBytes,
		checksumSha256,
		width: parsedWidth,
		height: parsedHeight,
		hasThumbnail: hasThumbnail === "1",
		createdAt,
	};
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every((entry) => typeof entry === "string")
	);
}

function assertPipeline(results: [error: Error | null, result: unknown][] | null): [error: Error | null, result: unknown][] {
	if (results === null) {
		throw new Error("Redis pipeline returned no results");
	}

	for (const [error] of results) {
		if (error !== null) {
			throw error;
		}
	}

	return results;
}

@Injectable()
export class CacheService {
	constructor(@Inject(REDIS) private readonly redis: Redis) {}

	async warmUploads(uploads: CachedUpload[]): Promise<void> {
		if (uploads.length === 0) {
			return;
		}

		const pipeline = this.redis.multi();

		for (const upload of uploads) {
			pipeline.hset(redisKeys.upload(upload.id), serialize(upload));
			pipeline.zadd(redisKeys.uploadsIndex, Date.parse(upload.createdAt), upload.id);
		}

		await pipeline.exec();
	}

	async replaceUploads(uploads: CachedUpload[]): Promise<string[]> {
		const existingIds = await this.redis.zrange(redisKeys.uploadsIndex, "0", "-1");
		const pipeline = this.redis.pipeline();

		for (const id of existingIds) {
			pipeline.del(redisKeys.upload(id));
		}

		pipeline.del(redisKeys.uploadsIndex);
		pipeline.del(redisKeys.statsOverview);

		for (const upload of uploads) {
			pipeline.hset(redisKeys.upload(upload.id), serialize(upload));
			pipeline.zadd(redisKeys.uploadsIndex, Date.parse(upload.createdAt), upload.id);
		}

		assertPipeline(await pipeline.exec());

		return existingIds;
	}

	async addUpload(upload: CachedUpload): Promise<void> {
		await this.redis
			.multi()
			.hset(redisKeys.upload(upload.id), serialize(upload))
			.zadd(redisKeys.uploadsIndex, Date.parse(upload.createdAt), upload.id)
			.del(redisKeys.statsOverview)
			.exec();
	}

	async setUpload(upload: CachedUpload): Promise<void> {
		await this.warmUploads([upload]);
	}

	async getUpload(id: string): Promise<CachedUpload | null> {
		const hash = await this.redis.hgetall(redisKeys.upload(id));

		return Object.keys(hash).length > 0 ? deserialize(hash) : null;
	}

	async getUploads(ids: readonly string[]): Promise<(CachedUpload | null)[]> {
		if (ids.length === 0) {
			return [];
		}

		const pipeline = this.redis.pipeline();

		for (const id of ids) {
			pipeline.hgetall(redisKeys.upload(id));
		}

		const results = assertPipeline(await pipeline.exec());

		return results.map(([, value]) => (isStringRecord(value) && Object.keys(value).length > 0 ? deserialize(value) : null));
	}

	async removeUpload(id: string): Promise<void> {
		await this.redis
			.multi()
			.del(redisKeys.upload(id))
			.zrem(redisKeys.uploadsIndex, id)
			.del(...VIEW_TYPES.map((type) => redisKeys.viewCounter(id, type)))
			.del(redisKeys.statsOverview)
			.exec();
	}

	async pruneUpload(id: string): Promise<void> {
		await this.redis
			.multi()
			.del(redisKeys.upload(id))
			.zrem(redisKeys.uploadsIndex, id)
			.del(...VIEW_TYPES.map((type) => redisKeys.viewCounter(id, type)))
			.exec();
	}

	async recentUploadIds(offset = 0, limit = 50): Promise<string[]> {
		return await this.redis.zrevrange(redisKeys.uploadsIndex, offset, offset + limit - 1);
	}

	async countUploads(): Promise<number> {
		return await this.redis.zcard(redisKeys.uploadsIndex);
	}

	async incrementView(id: string, type: ViewType): Promise<number> {
		const count = await this.redis.eval(INCREMENT_VIEW_SCRIPT, 2, redisKeys.viewCounter(id, type), redisKeys.statsOverview, type);

		return Number(count);
	}

	async warmViewCounters(entries: { uploadId: string; viewType: ViewType; count: number }[]): Promise<void> {
		if (entries.length === 0) {
			return;
		}

		const pipeline = this.redis.multi();

		for (const entry of entries) {
			pipeline.set(redisKeys.viewCounter(entry.uploadId, entry.viewType), String(entry.count));
		}

		pipeline.del(redisKeys.statsOverview);

		await pipeline.exec();
	}

	async replaceViewCounters(
		uploadIds: readonly string[],
		entries: { uploadId: string; viewType: ViewType; count: number }[],
	): Promise<void> {
		const pipeline = this.redis.pipeline();

		for (const uploadId of uploadIds) {
			pipeline.del(...VIEW_TYPES.map((type) => redisKeys.viewCounter(uploadId, type)));
		}

		for (const entry of entries) {
			pipeline.set(redisKeys.viewCounter(entry.uploadId, entry.viewType), String(entry.count));
		}

		pipeline.del(redisKeys.statsOverview);

		if (pipeline.length > 0) {
			assertPipeline(await pipeline.exec());
		}
	}

	async readViewCounters(id: string): Promise<ViewCounts> {
		const values = await this.redis.mget(VIEW_TYPES.map((type) => redisKeys.viewCounter(id, type)));
		const counts: ViewCounts = { page: 0, raw: 0, download: 0, total: 0 };

		VIEW_TYPES.forEach((type, position) => {
			const parsed = Number(values[position] ?? 0);
			const value = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
			counts[type] = value;
			counts.total += value;
		});

		return counts;
	}

	async getJson<T>(key: string): Promise<T | null> {
		const raw = await this.redis.get(key);

		if (raw === null) {
			return null;
		}

		try {
			return JSON.parse(raw) as T;
		} catch {
			await this.redis.del(key);
			return null;
		}
	}

	async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		const payload = JSON.stringify(value);

		if (ttlSeconds === undefined) {
			await this.redis.set(key, payload);
			return;
		}

		await this.redis.set(key, payload, "EX", ttlSeconds);
	}

	async del(key: string): Promise<void> {
		await this.redis.del(key);
	}
}

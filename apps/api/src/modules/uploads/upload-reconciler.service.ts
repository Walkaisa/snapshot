import { Injectable, Logger } from "@nestjs/common";
import { lookup } from "mime-types";

import { type UploadRecord, UploadRepository } from "../../db/repositories/upload.repository.js";
import { AuditService } from "../audit/audit.service.js";
import { probeDimensions } from "./media-dimensions.js";
import { StorageService, type StoredFile } from "./storage.service.js";

const FALLBACK_MIME_TYPE = "application/octet-stream";

export interface ReconciliationPlan {
	untracked: StoredFile[];
	orphans: string[];
}

export interface ReconciliationSummary {
	imported: number;
	orphans: number;
}

export function planReconciliation(files: StoredFile[], knownIds: readonly string[]): ReconciliationPlan {
	const known = new Set(knownIds);
	const onDisk = new Set(files.map((file) => file.id));

	return {
		untracked: files.filter((file) => !known.has(file.id)),
		orphans: knownIds.filter((id) => !onDisk.has(id)),
	};
}

@Injectable()
export class UploadReconcilerService {
	private readonly logger = new Logger(UploadReconcilerService.name);

	constructor(
		private readonly storage: StorageService,
		private readonly uploads: UploadRepository,
		private readonly audit: AuditService,
	) {}

	async reconcile(): Promise<ReconciliationSummary> {
		const [files, knownIds] = await Promise.all([this.storage.listFiles(), this.uploads.listIds()]);
		const plan = planReconciliation(files, knownIds);
		const imported: UploadRecord[] = [];

		for (const file of plan.untracked) {
			const mimeType = lookup(file.extension) || FALLBACK_MIME_TYPE;
			const dimensions = await probeDimensions(this.storage.pathFor(file.filename), mimeType);

			imported.push({
				id: file.id,
				extension: file.extension,
				mimeType,
				sizeBytes: file.sizeBytes,
				checksumSha256: await this.storage.checksum(file.filename),
				width: dimensions?.width ?? null,
				height: dimensions?.height ?? null,
				hasThumbnail: false,
				createdAt: file.modifiedAt,
			});
		}

		await this.uploads.insertMany(imported);

		if (plan.orphans.length > 0) {
			this.logger.warn({ orphans: plan.orphans }, `${plan.orphans.length} upload row(s) have no file on disk`);
		}

		if (imported.length > 0 || plan.orphans.length > 0) {
			this.audit.record({
				action: "system.uploads_reconciled",
				metadata: { imported: imported.length, orphans: plan.orphans.length },
			});
		}

		return { imported: imported.length, orphans: plan.orphans.length };
	}
}

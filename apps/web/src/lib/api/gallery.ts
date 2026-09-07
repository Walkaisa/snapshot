import type { DeleteData, Upload, UploadList, UploadStats } from "@snapshot/contracts";
import { UPLOAD_FILE_FIELD, UPLOAD_SLUG_FIELD } from "@snapshot/contracts";

import { clientApi, clientUpload, type UploadOptions } from "./client";

export const GALLERY_PAGE_SIZE = 24;

export function fetchUploadsPage(page: number, perPage: number): Promise<UploadList> {
	return clientApi<UploadList>(`/api/uploads?page=${page}&perPage=${perPage}`);
}

export function fetchUploadStats(id: string): Promise<UploadStats> {
	return clientApi<UploadStats>(`/api/uploads/${encodeURIComponent(id)}/stats`);
}

export function deleteUpload(id: string): Promise<DeleteData> {
	return clientApi<DeleteData>(`/api/uploads/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface UploadInput {
	file: File;
	slug: string | null;
}

export function uploadFile({ file, slug }: UploadInput, options: UploadOptions = {}): Promise<Upload> {
	const body = new FormData();

	if (slug !== null) {
		body.append(UPLOAD_SLUG_FIELD, slug);
	}

	body.append(UPLOAD_FILE_FIELD, file, file.name);

	return clientUpload<Upload>("/api/uploads", body, options);
}

export interface UploadUrls {
	url: string;
	pageUrl: string;
	rawUrl: string;
	thumbnailUrl: string | null;
	deleteUrl: string;
}

export interface PublicUploadUrls {
	pageUrl: string;
	rawUrl: string;
	thumbnailUrl: string | null;
	downloadUrl: string;
}

function pageUrl(baseUrl: string, id: string): string {
	return `${baseUrl}/${id}`;
}

function rawUrl(baseUrl: string, filename: string): string {
	return `${baseUrl}/raw/${filename}`;
}

function thumbnailUrl(baseUrl: string, id: string, hasThumbnail: boolean): string | null {
	return hasThumbnail ? `${baseUrl}/raw/thumbnail/${id}` : null;
}

export function buildUploadUrls(baseUrl: string, id: string, filename: string, hasThumbnail: boolean): UploadUrls {
	return {
		url: pageUrl(baseUrl, id),
		pageUrl: pageUrl(baseUrl, id),
		rawUrl: rawUrl(baseUrl, filename),
		thumbnailUrl: thumbnailUrl(baseUrl, id, hasThumbnail),
		deleteUrl: `${baseUrl}/api/uploads/${id}`,
	};
}

export function buildPublicUploadUrls(baseUrl: string, id: string, filename: string, hasThumbnail: boolean): PublicUploadUrls {
	return {
		pageUrl: pageUrl(baseUrl, id),
		rawUrl: rawUrl(baseUrl, filename),
		thumbnailUrl: thumbnailUrl(baseUrl, id, hasThumbnail),
		downloadUrl: `${rawUrl(baseUrl, filename)}?download=1`,
	};
}

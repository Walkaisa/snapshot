import { mediaKind } from "@snapshot/contracts";
import { FileArchive, FileAudio, FileImage, FileText, FileVideo, type LucideIcon } from "lucide-react";

export const CHECKERBOARD_STYLE = {
	backgroundImage: [
		"linear-gradient(45deg, var(--muted) 25%, transparent 25%)",
		"linear-gradient(-45deg, var(--muted) 25%, transparent 25%)",
		"linear-gradient(45deg, transparent 75%, var(--muted) 75%)",
		"linear-gradient(-45deg, transparent 75%, var(--muted) 75%)",
	].join(", "),
	backgroundSize: "22px 22px",
	backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0",
} as const;

export function fileIcon(mimeType: string): LucideIcon {
	const kind = mediaKind(mimeType);

	if (kind === "image") {
		return FileImage;
	}

	if (kind === "video") {
		return FileVideo;
	}

	const normalized = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";

	if (normalized.startsWith("audio/")) {
		return FileAudio;
	}

	if (/zip|compressed|tar|rar|7z/.test(normalized)) {
		return FileArchive;
	}

	return FileText;
}

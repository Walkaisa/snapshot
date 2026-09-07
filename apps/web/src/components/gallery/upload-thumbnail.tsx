"use client";

import { mediaKind, type Upload } from "@snapshot/contracts";
import { useEffect, useRef, useState } from "react";

import { useInView } from "@/hooks/use-in-view";
import { fileIcon } from "@/lib/media";
import { cn } from "@/lib/utils";

const STILL_MAX_EDGE = 640;

function posterSrc(rawUrl: string): string {
	return `${rawUrl}#t=0.1`;
}

function scaleToFit(width: number, height: number): { width: number; height: number } {
	const factor = Math.min(1, STILL_MAX_EDGE / Math.max(width, height));

	return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

function VideoThumbnail({ upload, className }: { upload: Upload; className?: string }) {
	const [ref, inView] = useInView<HTMLSpanElement>("300px");

	return (
		<span ref={ref} className={cn("block size-full bg-muted", className)}>
			{inView ? (
				<video
					src={posterSrc(upload.rawUrl)}
					preload="metadata"
					muted
					playsInline
					tabIndex={-1}
					onLoadedMetadata={(event) => {
						if (event.currentTarget.currentTime === 0) {
							event.currentTarget.currentTime = 0.1;
						}
					}}
					className="pointer-events-none size-full object-cover"
				/>
			) : null}
		</span>
	);
}

function StillThumbnail({ upload, className }: { upload: Upload; className?: string }) {
	const [ref, inView] = useInView<HTMLSpanElement>("300px");
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [decoded, setDecoded] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!inView || decoded || failed) {
			return;
		}

		let cancelled = false;

		async function paintFirstFrame(): Promise<void> {
			const response = await fetch(upload.rawUrl);

			if (!response.ok) {
				throw new Error(`Failed to load ${upload.id}`);
			}

			const frame = await createImageBitmap(await response.blob());
			const canvas = canvasRef.current;

			try {
				if (cancelled || canvas === null) {
					return;
				}

				const size = scaleToFit(frame.width, frame.height);
				canvas.width = size.width;
				canvas.height = size.height;
				canvas.getContext("2d")?.drawImage(frame, 0, 0, size.width, size.height);
				setDecoded(true);
			} finally {
				frame.close();
			}
		}

		void paintFirstFrame().catch(() => {
			if (!cancelled) {
				setFailed(true);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [inView, decoded, failed, upload.rawUrl, upload.id]);

	if (failed) {
		return (
			// biome-ignore lint/performance/noImgElement: originals are served byte-for-byte — next/image would re-encode and resize arbitrary user uploads
			<img src={upload.rawUrl} alt="" loading="lazy" decoding="async" className={cn("size-full bg-muted object-cover", className)} />
		);
	}

	return (
		<span ref={ref} className={cn("block size-full bg-muted", className)}>
			<canvas ref={canvasRef} className={cn("size-full object-cover transition-opacity", decoded ? "opacity-100" : "opacity-0")} />
		</span>
	);
}

export function UploadThumbnail({ upload, className, iconClassName }: { upload: Upload; className?: string; iconClassName?: string }) {
	const kind = mediaKind(upload.mimeType);

	if (upload.thumbnailUrl !== null) {
		return (
			// biome-ignore lint/performance/noImgElement: the API already rendered this still at thumbnail size — next/image would re-encode it a second time
			<img
				src={upload.thumbnailUrl}
				alt=""
				loading="lazy"
				decoding="async"
				className={cn("size-full bg-muted object-cover", className)}
			/>
		);
	}

	if (kind === "image") {
		if (upload.extension.toLowerCase() === "gif") {
			return <StillThumbnail upload={upload} className={className} />;
		}

		return (
			// biome-ignore lint/performance/noImgElement: originals are served byte-for-byte — next/image would re-encode and resize arbitrary user uploads
			<img src={upload.rawUrl} alt="" loading="lazy" decoding="async" className={cn("size-full bg-muted object-cover", className)} />
		);
	}

	if (kind === "video") {
		return <VideoThumbnail upload={upload} className={className} />;
	}

	const Icon = fileIcon(upload.mimeType);

	return (
		<span className={cn("flex size-full items-center justify-center bg-muted text-muted-foreground", className)}>
			<Icon className={cn("size-8", iconClassName)} />
		</span>
	);
}

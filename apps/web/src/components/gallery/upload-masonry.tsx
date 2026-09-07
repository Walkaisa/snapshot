"use client";

import type { Upload } from "@snapshot/contracts";
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { GallerySkeleton } from "./gallery-skeleton";
import { UploadCard } from "./upload-card";

const DEFAULT_COLUMNS = 3;
const FALLBACK_ASPECT = 4 / 3;

const TILE_TARGET_WIDTH = 336;
const COLUMN_GAP = 16;
const MAX_COLUMNS = 4;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function columnsForWidth(width: number): number {
	const fits = Math.floor((width + COLUMN_GAP) / (TILE_TARGET_WIDTH + COLUMN_GAP));

	return Math.min(MAX_COLUMNS, Math.max(1, fits));
}

function heightRatio(upload: Upload): number {
	if (upload.width !== null && upload.height !== null) {
		return upload.height / upload.width;
	}
	return 1 / FALLBACK_ASPECT;
}

function useColumnCount(): [RefObject<HTMLDivElement | null>, number, boolean] {
	const ref = useRef<HTMLDivElement | null>(null);
	const [columns, setColumns] = useState(DEFAULT_COLUMNS);
	const [ready, setReady] = useState(false);

	useIsomorphicLayoutEffect(() => {
		const node = ref.current;

		if (node === null) {
			return;
		}

		setColumns(columnsForWidth(node.clientWidth));
		setReady(true);

		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;

			if (width !== undefined) {
				setColumns(columnsForWidth(width));
			}
		});

		observer.observe(node);

		return () => observer.disconnect();
	}, []);

	return [ref, columns, ready];
}

export function UploadMasonry({
	uploads,
	onOpenDetails,
	onDelete,
}: {
	uploads: Upload[];
	onOpenDetails: (upload: Upload) => void;
	onDelete: (upload: Upload) => void;
}) {
	const [containerRef, columns, ready] = useColumnCount();

	const buckets = useMemo(() => {
		const columnItems: Upload[][] = Array.from({ length: columns }, () => []);
		const columnHeights = new Array<number>(columns).fill(0);

		for (const upload of uploads) {
			let shortest = 0;
			let minHeight = columnHeights[0] ?? 0;

			for (let index = 1; index < columns; index += 1) {
				const height = columnHeights[index] ?? 0;

				if (height < minHeight) {
					minHeight = height;
					shortest = index;
				}
			}

			columnItems[shortest]?.push(upload);
			columnHeights[shortest] = minHeight + heightRatio(upload);
		}

		return columnItems;
	}, [uploads, columns]);

	return (
		<div ref={containerRef}>
			{ready ? (
				<div className="flex items-start gap-4">
					{buckets.map((bucket, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional buckets, not reorderable entities
						<div key={index} className="flex min-w-0 flex-1 flex-col gap-4">
							{bucket.map((upload) => (
								<UploadCard key={upload.id} upload={upload} onOpenDetails={onOpenDetails} onDelete={onDelete} />
							))}
						</div>
					))}
				</div>
			) : (
				<GallerySkeleton />
			)}
		</div>
	);
}

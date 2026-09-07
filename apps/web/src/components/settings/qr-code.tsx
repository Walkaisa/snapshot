"use client";

import qrcode from "qrcode-generator";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

const QUIET_ZONE = 2;
const ERROR_CORRECTION = "M";

export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
	const { path, size } = useMemo(() => {
		const code = qrcode(0, ERROR_CORRECTION);
		code.addData(value);
		code.make();

		const count = code.getModuleCount();
		const segments: string[] = [];

		for (let row = 0; row < count; row += 1) {
			for (let column = 0; column < count; column += 1) {
				if (code.isDark(row, column)) {
					segments.push(`M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`);
				}
			}
		}

		return { path: segments.join(""), size: count + QUIET_ZONE * 2 };
	}, [value]);

	return (
		<svg
			viewBox={`0 0 ${size} ${size}`}
			role="img"
			aria-label={label}
			shapeRendering="crispEdges"
			className={cn("size-44 rounded-md bg-white text-black", className)}
		>
			<title>{label}</title>
			<rect width={size} height={size} fill="currentColor" fillOpacity={0} />
			<path d={path} fill="currentColor" />
		</svg>
	);
}

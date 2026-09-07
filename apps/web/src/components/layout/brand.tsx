import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandProps {
	className?: string;
	imageClassName?: string;
	labelClassName?: string;
}

export function Brand({ className, imageClassName, labelClassName }: BrandProps) {
	return (
		<div className={cn("flex items-center gap-2.5", className)}>
			<Image src="/logo.png" alt="Snapshot" width={32} height={32} priority className={cn("size-8 rounded-lg", imageClassName)} />
			<span className={cn("font-semibold text-base tracking-tight", labelClassName)}>Snapshot</span>
		</div>
	);
}

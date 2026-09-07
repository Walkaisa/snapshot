import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_PINS = [
	{ key: "a", aspect: 1.3 },
	{ key: "b", aspect: 0.8 },
	{ key: "c", aspect: 1 },
	{ key: "d", aspect: 1.5 },
	{ key: "e", aspect: 0.7 },
	{ key: "f", aspect: 1.2 },
	{ key: "g", aspect: 0.9 },
	{ key: "h", aspect: 1.4 },
	{ key: "i", aspect: 1 },
	{ key: "j", aspect: 0.75 },
	{ key: "k", aspect: 1.6 },
	{ key: "l", aspect: 0.85 },
];

export function GallerySkeleton() {
	return (
		<div className="columns-[21rem] gap-4">
			{SKELETON_PINS.map((pin) => (
				<Skeleton key={pin.key} style={{ aspectRatio: pin.aspect }} className="mb-4 w-full break-inside-avoid rounded-2xl" />
			))}
		</div>
	);
}

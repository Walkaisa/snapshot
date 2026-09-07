import { fillTemplate, formatCreatedAt } from "@snapshot/contracts";
import Image from "next/image";

const SAMPLE_UPLOAD = {
	extension: "png",
	content_type: "image/png",
	size: "2085888",
	size_human: "2037 KB",
	createdAt: "2026-07-07T16:58:59.000Z",
};

export const DEFAULT_EMBED_THEME_COLOR = "#5865F2";

const FALLBACK_LOCALE = "en-US";
const FALLBACK_TIME_ZONE = "UTC";

function safeFormatCreatedAt(iso: string, locale: string, timeZone: string): string {
	try {
		return formatCreatedAt(iso, locale, timeZone);
	} catch {
		return formatCreatedAt(iso, FALLBACK_LOCALE, FALLBACK_TIME_ZONE);
	}
}

const PLACEHOLDER_TEXT = "Snapshot";

const DISCORD_SURFACE_LIGHT = "#FFFFFF";
const DISCORD_SURFACE_DARK = "#111214";

function normalizeHexColor(value: string): string {
	return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : DEFAULT_EMBED_THEME_COLOR;
}

function hexToRgb(hex: string): [number, number, number] {
	return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function rgbToHex([red, green, blue]: [number, number, number]): string {
	return [red, green, blue]
		.map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
}

function mixHexColor(from: string, to: string, amount: number): string {
	const fromRgb = hexToRgb(from);
	const toRgb = hexToRgb(to);

	return rgbToHex([
		fromRgb[0] + (toRgb[0] - fromRgb[0]) * amount,
		fromRgb[1] + (toRgb[1] - fromRgb[1]) * amount,
		fromRgb[2] + (toRgb[2] - fromRgb[2]) * amount,
	]);
}

function Placeholder({ themeColor, mode, className }: { themeColor: string; mode: "light" | "dark"; className: string }) {
	const color = normalizeHexColor(themeColor);

	const background = mode === "dark" ? mixHexColor(DISCORD_SURFACE_DARK, color, 0.14) : mixHexColor(DISCORD_SURFACE_LIGHT, color, 0.22);

	const foreground = mode === "dark" ? mixHexColor(color, DISCORD_SURFACE_LIGHT, 0.35) : mixHexColor(color, DISCORD_SURFACE_DARK, 0.08);

	return (
		<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
			<rect width="800" height="400" fill={`#${background}`} />
			<text
				x="400"
				y="200"
				fill={`#${foreground}`}
				fontFamily="var(--font-sans)"
				fontSize="72"
				fontWeight="600"
				textAnchor="middle"
				dominantBaseline="middle"
			>
				{PLACEHOLDER_TEXT}
			</text>
		</svg>
	);
}

export function EmbedPreview({
	baseUrl,
	description,
	embedLocale,
	previewFileId,
	providerName,
	themeColor,
	timezone,
	title,
	username,
}: {
	baseUrl: string;
	description: string;
	embedLocale: string;
	previewFileId: string;
	providerName: string;
	themeColor: string;
	timezone: string;
	title: string;
	username: string;
}) {
	const { createdAt, ...sample } = SAMPLE_UPLOAD;
	const filename = `${previewFileId}.${sample.extension}`;

	const values = {
		...sample,
		id: previewFileId,
		filename,
		provider: providerName,
		created_at: safeFormatCreatedAt(createdAt, embedLocale, timezone),
	};

	const filledTitle = fillTemplate(title, values);
	const filledDescription = fillTemplate(description, values);
	const uploadUrl = `${baseUrl}/${previewFileId}`;

	return (
		<div className="w-full max-w-125.5 font-sans text-[#313338] dark:text-[#dbdee1]" data-testid="discord-preview">
			<div className="relative min-h-91.75 px-2.5 pt-2 pb-4.5 pl-15">
				<div className="absolute top-2 left-1 size-10 overflow-hidden rounded-full bg-[#e3e5e8] ring-1 ring-black/10 dark:bg-[#0b0c0f] dark:ring-black/70">
					<Image src="/logo.png" alt={`${username} avatar`} fill sizes="40px" className="object-cover" />
				</div>

				<div className="h-5 overflow-hidden whitespace-nowrap text-base leading-5">
					<span className="font-medium text-foreground">{username}</span>
				</div>

				<a href={uploadUrl} className="block h-5 max-w-full truncate text-[#00a8fc] text-base leading-5 hover:underline">
					{uploadUrl}
				</a>

				<div
					className="mt-0.75 w-full max-w-108 rounded border border-[#d4d7dc] border-l-4 bg-[#f2f3f5] pt-3 pr-4 pb-4.5 pl-3 dark:border-[#2b2d31] dark:bg-[#111214]"
					style={{ borderLeftColor: themeColor }}
					data-testid="discord-embed-card"
				>
					{providerName.length > 0 ? (
						<p className="m-0 text-[#4e5058] text-[12px] leading-4 dark:text-[#dbdee1]">{providerName}</p>
					) : null}

					{filledTitle.length > 0 ? (
						<a
							href={uploadUrl}
							className="wrap-break-word mt-1.75 block font-semibold text-[#006ce7] text-base leading-5 hover:underline dark:text-[#00a8fc]"
						>
							{filledTitle}
						</a>
					) : null}

					{filledDescription.length > 0 ? (
						<p className="wrap-break-word m-0 mt-1.75 whitespace-pre-wrap text-[#313338] text-[14px] leading-4.5 dark:text-[#dbdee1]">
							{filledDescription}
						</p>
					) : null}

					<div
						className="relative mt-4 aspect-2/1 w-full overflow-hidden rounded bg-white dark:bg-[#111214]"
						role="img"
						aria-label="Snapshot placeholder preview"
					>
						<Placeholder themeColor={themeColor} mode="light" className="size-full object-cover dark:hidden" />
						<Placeholder themeColor={themeColor} mode="dark" className="hidden size-full object-cover dark:block" />
					</div>
				</div>
			</div>
		</div>
	);
}

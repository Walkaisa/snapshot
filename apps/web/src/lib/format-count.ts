const SUPERSCRIPTS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"] as const;
const EXACT_BELOW = 1e6;
const COMPACT_BELOW = 1e15;

function superscript(value: number): string {
	return String(value)
		.split("")
		.map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit)
		.join("");
}

export function formatMagnitude(value: number, locale: string): string {
	if (!Number.isFinite(value) || value <= 0) {
		return "0";
	}

	if (value < EXACT_BELOW) {
		return new Intl.NumberFormat(locale).format(Math.round(value));
	}

	const exponent = Math.floor(Math.log10(value));
	const mantissa = value / 10 ** exponent;
	const rounded = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mantissa);

	return `${rounded} × 10${superscript(exponent)}`;
}

export function formatCompact(value: number, locale: string): string {
	if (!Number.isFinite(value) || value <= 0) {
		return "0";
	}

	if (value >= COMPACT_BELOW) {
		return formatMagnitude(value, locale);
	}

	return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(value));
}

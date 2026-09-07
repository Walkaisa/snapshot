const TEMPLATE_PLACEHOLDER = /\{([^{}]*)\}/g;
const BYTES_PER_KIB = 1024;
const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function parseCsv(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export function normalizeExtension(extension: string): string {
	const cleaned = extension.trim().toLowerCase();

	if (cleaned.length === 0 || cleaned.startsWith(".")) {
		return cleaned;
	}

	return `.${cleaned}`;
}

export function humanReadableSize(sizeBytes: number): string {
	let value = sizeBytes;
	let unitIndex = 0;

	while (value >= BYTES_PER_KIB && unitIndex < SIZE_UNITS.length - 1) {
		value /= BYTES_PER_KIB;
		unitIndex += 1;
	}

	return `${value.toFixed(1)} ${SIZE_UNITS[unitIndex]}`;
}

export function templatePlaceholders(template: string): string[] {
	return [...template.matchAll(TEMPLATE_PLACEHOLDER)].map((match) => match[1] ?? "");
}

export function renderTemplate(template: string, values: Record<string, string>): string {
	return template.replace(TEMPLATE_PLACEHOLDER, (_raw, name: string) => {
		const value = values[name];

		if (value === undefined) {
			throw new Error(`Unknown template variable: {${name}}`);
		}

		return value;
	});
}

export function fillTemplate(template: string, values: Record<string, string>): string {
	return template.replace(TEMPLATE_PLACEHOLDER, (raw, name: string) => values[name] ?? raw);
}

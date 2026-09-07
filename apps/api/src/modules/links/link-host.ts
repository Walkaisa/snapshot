export function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return "unknown";
	}
}

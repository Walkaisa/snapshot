export const AUDIT_RANGE_HOURS = [24, 24 * 7, 24 * 30, 0] as const;
export const DEFAULT_AUDIT_RANGE_HOURS = 24 * 7;

export function rangeStart(hours: number): string | null {
	return hours === 0 ? null : new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function getRequestId(req: { id?: unknown }): string {
	return typeof req.id === "string" || typeof req.id === "number" ? String(req.id) : "unknown";
}

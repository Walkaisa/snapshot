import type { ProjectMeta } from "@snapshot/contracts";

import { clientApi } from "./client";

export function fetchMeta(): Promise<ProjectMeta> {
	return clientApi<ProjectMeta>("/api/meta");
}

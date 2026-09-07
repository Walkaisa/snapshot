import type { IdAvailability } from "@snapshot/contracts";

import { clientApi } from "./client";

export function fetchIdAvailability(id: string): Promise<IdAvailability> {
	return clientApi<IdAvailability>(`/api/ids/${encodeURIComponent(id)}`);
}

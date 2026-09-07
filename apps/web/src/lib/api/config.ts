import type { ApiKeyData, ConfigUpdate, ConfigView } from "@snapshot/contracts";

import { clientApi } from "./client";

export const SHAREX_CONFIG_PATH = "/api/sharex";

export function updateConfig(input: ConfigUpdate): Promise<ConfigView> {
	return clientApi<ConfigView>("/api/config", { method: "PATCH", body: JSON.stringify(input) });
}

export function revealApiKey(): Promise<ApiKeyData> {
	return clientApi<ApiKeyData>("/api/api-key");
}

export function rotateApiKey(): Promise<ApiKeyData> {
	return clientApi<ApiKeyData>("/api/api-key/rotate", { method: "POST" });
}

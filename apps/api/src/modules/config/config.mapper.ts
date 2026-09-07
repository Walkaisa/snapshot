import type { ConfigView, RuntimeConfig } from "@snapshot/contracts";

const MASK = "•".repeat(8);

export function maskApiKey(apiKey: string): string {
	return `${MASK}${apiKey.slice(-4)}`;
}

export function toConfigView(config: RuntimeConfig): ConfigView {
	return { ...config, apiKey: maskApiKey(config.apiKey) };
}

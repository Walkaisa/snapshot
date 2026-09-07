import { type ApiEnv, apiEnvSchema } from "@snapshot/contracts";

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
	const result = apiEnvSchema.safeParse(source);

	if (!result.success) {
		const issues = result.error.issues.map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");

		throw new Error(`Invalid API environment configuration:\n${issues}`);
	}

	return result.data;
}

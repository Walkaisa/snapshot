import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		root: "./",
		environment: "node",
		globalSetup: ["./test/e2e/global-setup.ts"],
		setupFiles: ["./test/setup-env.ts"],
		include: ["test/e2e/**/*.e2e-spec.ts"],
		fileParallelism: false,
		hookTimeout: 30_000,
		testTimeout: 20_000,
	},
	oxc: false,
	plugins: [swc.vite({ module: { type: "es6" } })],
});

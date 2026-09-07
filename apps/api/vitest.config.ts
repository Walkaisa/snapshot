import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		root: "./",
		environment: "node",
		setupFiles: ["./test/setup-env.ts"],
		include: ["test/unit/**/*.spec.ts"],
	},
	oxc: false,
	plugins: [swc.vite({ module: { type: "es6" } })],
});

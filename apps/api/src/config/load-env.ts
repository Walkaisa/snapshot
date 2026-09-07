import { existsSync } from "node:fs";
import path from "node:path";

const FILENAMES = [".env.local", ".env"];
const DIRECTORIES = [".", "../.."];

export function loadLocalEnv(): void {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	for (const directory of DIRECTORIES) {
		for (const filename of FILENAMES) {
			const file = path.resolve(process.cwd(), directory, filename);

			if (!existsSync(file)) {
				continue;
			}

			try {
				process.loadEnvFile(file);
			} catch {}

			return;
		}
	}
}

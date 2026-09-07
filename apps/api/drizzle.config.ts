import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema/*.schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	casing: "snake_case",
	strict: true,
	verbose: true,
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgres://snapshot:snapshot@localhost:5432/snapshot",
	},
});

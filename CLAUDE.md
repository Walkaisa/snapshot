# CLAUDE.md

**All coding conventions for this repo live in [`AGENTS.md`](AGENTS.md). Read it
first and follow it exactly** — it is the single source of truth (tooling, module
rules, API/contracts/web/db/test/security conventions, definition of done). This
file only adds Claude-specific notes; it does not restate those rules.

## Quick reminders

- Run `pnpm check:fix` (Biome) after editing; finish with `pnpm check`,
  `pnpm typecheck`, `pnpm build`, `pnpm test` green.
- NodeNext: relative imports need the `.js` extension. Injected NestJS classes are
  **value** imports, never `import type` (see AGENTS.md §6).
- **No comments in source** — only `biome-ignore` / `@ts-expect-error` directives, with a
  reason. Don't co-locate tests. Don't put server data in Zustand. Don't add `/api` routes
  to the web app. Don't add a config key nothing enforces.
- When you change a convention, update `AGENTS.md` in the same change.

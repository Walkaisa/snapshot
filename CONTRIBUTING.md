# Contributing

Thanks for helping improve Snapshot.

## Setup

Node 24 (see `.nvmrc`) and pnpm (see `packageManager` in `package.json`).

```bash
pnpm install
cp .env.example .env                        # dev defaults work as-is
docker compose -f compose.dev.yml up -d     # Postgres + Redis
pnpm dev                                    # api :3001 + web :3000
```

More detail — tests, database, Docker builds — is in
[docs/development.md](docs/development.md). Conventions live in
[AGENTS.md](AGENTS.md); read that before writing code.

## Checks

Run the full gate before opening a pull request — CI runs exactly these:

```bash
pnpm check       # Biome: lint + format (pnpm check:fix autofixes)
pnpm typecheck
pnpm build
pnpm test        # unit — no infrastructure
pnpm test:e2e    # api e2e — needs Postgres + Redis
docker compose -f compose.dev.yml config --quiet
```

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Add or update tests for API behavior, security boundaries, and storage changes.
- Update `AGENTS.md` in the same change when you change a convention.
- Update documentation when configuration, deployment, or API behavior changes.
- Do not commit secrets, uploads, logs, or caches.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org);
the full house rules are in
[.github/COMMIT_MESSAGE_INSTRUCTIONS.md](.github/COMMIT_MESSAGE_INSTRUCTIONS.md).

## Releases

Nobody picks a version or pushes a tag. Every push to `main` runs semantic-release,
which derives the next version from the commit types since the last release:
`fix:` and `perf:` bump the patch, `feat:` the minor, and a `!` or a
`BREAKING CHANGE:` footer the major. Everything else — `refactor:`, `docs:`,
`chore:`, `test:`, `ci:`, `build:` — releases nothing on its own.

Picking the right type is therefore part of the change, not bookkeeping: it decides
the version number, the release notes and the published image tags. Details in
[docs/development.md](docs/development.md#releasing).

## Security

Please do not open public issues for vulnerabilities. Follow
[SECURITY.md](SECURITY.md) instead.

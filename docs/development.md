# Development

Node 24 (`.nvmrc`) and pnpm (see `packageManager`). Conventions are in
[AGENTS.md](../AGENTS.md) — read that before writing code; this page is just how to run
things.

## Setup

```bash
pnpm install
docker compose -f compose.dev.yml up -d         # Postgres + Redis only
pnpm dev                                        # api :3001 + web :3000
```

**There is no env file to copy.** Every setting defaults to the local stack that
`compose.dev.yml` starts. `.env.example` is the *deployment* template and is read only by
`docker compose up` — don't copy it here. To override something locally, put it in a root
`.env.local`; the full list is in [Configuration](configuration.md#which-file).

`pnpm dev` builds `packages/contracts` first (the `dev` task depends on `^build`), then
starts both servers. Contracts are **not** rebuilt on change while dev is running — after
editing a schema, run `pnpm build --filter @snapshot/contracts` or restart `pnpm dev`.

Open <http://localhost:3000> and create the admin account. Migrations run automatically
when the API starts.

In dev the browser only ever talks to `:3000` — `next.config.ts` proxies `/api` and `/raw`
to the API, so the single-origin cookie model matches production. Those rewrites are
**dev-only**; in production your nginx does the routing.

## Layout

```
apps/api          NestJS: uploads, links, auth, config, stats
apps/web          Next.js: dashboard + public share pages
packages/contracts  Zod schemas + inferred types — the contract between them
packages/config     shared tsconfig bases
```

## Commands

```bash
pnpm check:fix     # Biome: lint + format + organize imports (run before finishing)
pnpm typecheck     # tsc --noEmit everywhere
pnpm build         # every workspace
pnpm test          # unit — fast, no infrastructure
pnpm test:e2e      # api e2e — needs Postgres + Redis
pnpm test:e2e:web  # Playwright — needs the stack running
```

Filter to one workspace: `pnpm --filter @snapshot/api <script>`.

## Tests

Tests live in each package's `test/` folder, never beside the source.

| | |
|---|---|
| `apps/api/test/unit` | Pure logic — no infrastructure. |
| `apps/api/test/e2e` | Full app + real Postgres/Redis, against an isolated `snapshot_test` database and Redis DB 1. Never touches your dev data. |
| `apps/web/test/unit` | Pure logic. |
| `apps/web/test/component` | React via Testing Library + jsdom. |
| `apps/web/e2e` | Playwright — see below. |
| `packages/contracts/test` | Every validator edge case. |

Prefer extracting pure functions (`parseByteRange`, `resolveGateRedirect`,
`shareMetadata`) so behaviour can be tested without spinning anything up.

### Playwright

The browser specs sign in, upload and read the API key, so they need a **throwaway
instance** — never your dev stack. Setup is one-shot by design, so an instance that
already has a different admin cannot be adopted; the specs fail loudly instead.

```bash
# a stack of its own: separate database, redis db and upload dir
docker exec snapshot-dev-postgres psql -U snapshot -d postgres -c "CREATE DATABASE snapshot_e2e;"

DATABASE_URL=postgres://snapshot:snapshot@localhost:5432/snapshot_e2e \
REDIS_URL=redis://localhost:6379/3 UPLOADS_DIR=/tmp/e2e-uploads \
PORT=3101 BASE_URL=http://localhost:3100 \
pnpm --filter @snapshot/api start &

API_INTERNAL_URL=http://localhost:3101 pnpm --filter @snapshot/web exec next dev -p 3100 &

E2E_BASE_URL=http://localhost:3100 pnpm test:e2e:web
```

`E2E_USERNAME` / `E2E_PASSWORD` override the admin the specs create.

## Database

```bash
pnpm --filter @snapshot/api db:generate   # schema change → new SQL migration
pnpm --filter @snapshot/api db:studio     # browse the data
```

Migrations are applied at API startup. **Never edit a generated migration** — change the
schema and regenerate.

## Releasing

Releases are fully automated and commit-driven — you never pick a version or push a tag.
Every push to `main` runs [semantic-release](https://semantic-release.gitbook.io/):

- It looks at the Conventional Commit messages since the last `v*` tag.
- `fix:` / `perf:` → patch, `feat:` → minor, `feat!:` or a `BREAKING CHANGE:` footer → major.
  `refactor:`, `docs:`, `test:`, `chore:`, `ci:`, `build:` on their own release nothing.
- If a bump is due it writes the new number into the root `package.json`, commits that back
  as `chore(release): x.y.z [skip ci]`, creates the tag `vx.y.z` and the GitHub Release, whose
  auto-generated notes **are** the changelog (there is no `CHANGELOG.md`). The `apps/*` and
  `packages/*` manifests are left alone — nothing reads them.
- The same workflow builds the image once: on a release it is tagged `x.y.z`, `x.y` and
  `latest`; otherwise the push just refreshes `ghcr.io/walkaisa/snapshot:main` (rolling) and
  `:sha-<short>` (immutable), both `linux/amd64` and `linux/arm64`.

So: land a `fix:`/`feat:` on `main` → a release and its image appear on their own within a
few minutes. The release build stamps the version into the image as `APP_VERSION`, which is
what the dashboard's version card reads. Nothing is published to npm; the release *is* the
image.

To jump a major, use a `BREAKING CHANGE:` footer. To set an exact number out of sequence,
create that git tag on `main` by hand once (`git tag v2.0.0 && git push origin v2.0.0`);
semantic-release picks up from the newest tag it finds.

## Docker

One `Dockerfile`, one image: the API and the dashboard ship together and
`docker/supervisor.mjs` runs both.

The workflow builds each architecture on a runner of its own architecture and merges the
two into one manifest list, rather than emulating arm64 under QEMU — the emulated pnpm
install plus Next build takes the better part of an hour. Locally, `docker build` produces
only your own architecture, which is all a smoke test needs.

```bash
docker build -t snapshot .                          # API + web, one image
docker compose up -d --build
```

Note that the production stack **cannot be smoke-tested over plain HTTP**: session cookies
use the `__Host-` prefix, so you need a TLS front (see [deployment.md](deployment.md)) for
anything past the public endpoints.

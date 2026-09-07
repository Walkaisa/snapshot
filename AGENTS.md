# AGENTS.md

Operating manual for any coding agent (and human) working in this repository.
**Read this before writing code.** It is the single source of truth for
conventions; keep it current when a convention changes.

---

## 1. What this is

**Snapshot** — a self-hosted screenshot / media upload service with a link shortener
(a ShareX target), built as a TypeScript monorepo.

| App / package | Stack | Role |
|---|---|---|
| `apps/web` | Next.js 16 (App Router) | Dashboard + public share pages (SSR embeds) |
| `apps/api` | NestJS 11 (Express 5) | REST API: uploads, short links, auth, config, stats |
| `packages/contracts` | Zod v4 | Shared schemas + inferred types — **the contract** |
| `packages/config` | tsconfig presets | Shared strict TS bases (`base`, `node`) |

Persistence is **PostgreSQL** (metadata) + **Redis** (sessions, cache, throttling).
The public edge is the operator's **own nginx** (single origin) — not bundled.

---

## 2. Golden rules

1. **Contracts first.** Every request/response/env shape is a Zod schema in
   `packages/contracts`. Never redefine a type an app could import. Validate all
   external input (bodies, params, queries, env) against a schema.
2. **One toolchain.** Lint + format + import-order is **Biome**, run from the
   root. There is no ESLint/Prettier. Run `pnpm check:fix` before you finish.
3. **No comments in source.** Code must read on its own — name things so it does.
   The only comments that may exist are tool directives (`biome-ignore`,
   `@ts-expect-error`) and they must carry a reason. Everything a comment used to
   explain belongs here, in `docs/`, or in a name. Delete any comment you find.
4. **Tests live in `test/`,** never beside the source file.
5. **API JSON is camelCase; the database is snake_case.** Do not leak snake_case
   into API payloads or camelCase into SQL. (Embed-template placeholders like
   `{size_human}` stay snake_case — they are user-facing config.)
6. **Types are load-bearing.** `strict` is on; no `any`, no non-null `!` to
   silence the compiler, no `@ts-ignore` without a one-line justification.
7. **Ports are fixed:** web `3000`, api `3001`. Don't hard-code URLs — read env.

---

## 3. Environment & commands

- **Package manager:** pnpm (see `packageManager` in `package.json`). `.npmrc`
  sets `engine-strict` + `save-exact` — **pin exact versions**, no `^`/`~` in
  app/package manifests (the shared tsconfig dep uses `workspace:*`).
- **Node:** 24 (`.nvmrc`, `node:24-alpine`); `engines` floor is `>=24`.
- **Two env files, one reader each — keep it that way.** `.env` is read by
  `docker compose` and by nothing else; a root `.env.local` is optional local-dev override,
  read by `loadLocalEnv` (which falls back to `.env` so an older single-file checkout still
  boots). `.env.example` therefore documents a **deployment** only: four required values
  (`BASE_URL`, `SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`) and everything
  else commented out at the value it already has. **Local dev stays zero-config** —
  `DATABASE_URL`/`REDIS_URL` default to what `compose.dev.yml` serves (`DEV_DATABASE_URL`,
  `DEV_REDIS_URL` in contracts), so a setting a developer would otherwise have to copy into a
  file belongs in `apiEnvSchema` as a default instead. Never put a variable in `.env.example`
  that compose already derives (`DATABASE_URL` from `POSTGRES_PASSWORD`) or that its own
  runtime already fixes (`PORT`, `NODE_ENV`, `API_INTERNAL_URL`) — one file listing both a
  connection string and the password it is built from is what made the old one unreadable.
  Compose publishes both ports on one `BIND_ADDRESS` (default `127.0.0.1`), not a pair of
  per-service bind variables.
- **Agent tooling is committed on purpose.** `AGENTS.md` (this file) and `CLAUDE.md` are the
  conventions; `.agents/skills/` holds vendored upstream skills pinned by hash in
  `skills-lock.json` (currently shadcn/ui's, MIT). Both are excluded from Biome and from the
  Docker context — they never reach an image.
- **Build orchestration:** Turborepo. Prefer root scripts over per-package calls.
  The `dev` task depends on `^build`, so `pnpm dev` builds `packages/contracts` before
  starting either server — but it does **not** watch it. After changing a schema, run
  `pnpm build --filter @snapshot/contracts` or restart `pnpm dev`.
- **Releases are fully automated, commit-driven** (`.github/workflows/release.yml`,
  `.releaserc.json`). Every push to `main` runs semantic-release: it reads the Conventional
  Commit history since the last `v*` tag and, if anything warrants it (`fix`/`perf` → patch,
  `feat` → minor, `!`/`BREAKING CHANGE:` → major), bumps the root `package.json`, commits it
  back as `chore(release): <version> [skip ci]`, tags `v<version>` and publishes the GitHub
  Release with generated notes. No PR, no manual step. The same workflow then builds the image
  once and, on a release, tags it `:<version>`, `:<major>.<minor>` and `:latest`; a push with
  no releasable commits still publishes `:main` (rolling) and `:sha-<short>` (immutable). There
  is no `CHANGELOG.md` — the GitHub Release notes are the changelog. Never tag or bump a
  version by hand. `docker.yml` is a reusable workflow (`workflow_call`) plus a manual
  `workflow_dispatch` escape hatch that takes an optional `version`. The bump-back push runs
  as `GITHUB_TOKEN`, so it retriggers nothing; if `main` ever gets branch protection that
  blocks it, semantic-release needs a GitHub App token instead.
- **Dependencies are updated by hand.** There is no Dependabot: on a pnpm workspace it opens
  one lockfile-touching PR per group per week, every one of which has to be reviewed and
  merged in order, and `next-themes` is pnpm-patched at an exact version so a bump there
  breaks patch application and fails the whole run. Update deliberately instead —
  `pnpm outdated -r`, then `pnpm up -r --latest` for a batch, re-diffing
  `patches/next-themes@0.4.6.patch` against the new release before moving that one.
  `@semantic-release/git` is held at `10.x` on purpose: `11.x` requires Node `>=24.15`, above
  this repo's declared `>=24` floor, and `engine-strict` would then break `pnpm install` for
  anyone on a `.nvmrc`-conformant 24.x. Raise `engines.node` and `.nvmrc` first, or leave it.
- **There is exactly one image** (root `Dockerfile`, `compose.yml`, `docs/deployment.md`):
  `ghcr.io/walkaisa/snapshot` carries API **and** dashboard, and a deployment is configured
  purely through environment variables. Do not reintroduce per-app images or compose
  profiles — a second way to deploy doubles the surface that has to be documented, validated
  and kept in step for no capability the env vars do not already give.
  `turbo prune @snapshot/api @snapshot/web --docker` → install → build → **`pnpm deploy
  --legacy`** (a pnpm `node_modules` cannot be copied between stages — its symlinks break).
  `node:24-alpine`, non-root, HEALTHCHECK on both ports.
  The API resolves `drizzle/` **and** `UPLOADS_DIR` against the cwd, so both must sit under
  the runner's `/app` — the two apps therefore get **separate subtrees** (`/app/api`,
  `/app/web`) and `docker/supervisor.mjs` starts each with its own cwd and `PORT`. If either
  process exits the container goes down with it; there is no partial restart.
  `.dockerignore` patterns are root-anchored: `uploads/` does **not** match
  `apps/api/uploads/` — spell such paths out, and never use `**/uploads/`, which also
  swallows the uploads source module and the web's `/uploads` route. Compose publishes to
  loopback; the operator's nginx is the only public edge. Note that **nothing authenticates
  over plain HTTP**: production cookies carry the `__Host-` prefix, so any end-to-end smoke
  test needs a TLS front.
- **The image is multi-arch — `linux/amd64` + `linux/arm64` under one tag.** Snapshot is a
  self-hosted service and a Raspberry Pi is a first-class target; an amd64-only tag fails on
  the Pi with a platform mismatch. `.github/workflows/docker.yml` builds each architecture on
  a runner of that architecture (`ubuntu-latest` / `ubuntu-24.04-arm`, free for public repos)
  and merges the digests with `docker buildx imagetools create`. **A per-architecture build
  must never push a tag** — it pushes by digest only, or the two jobs race and whichever
  finishes last leaves the tag single-arch. Emulating arm64 with QEMU instead would work but
  costs the better part of an hour for the pnpm install and Next build.
- **The version the dashboard shows is stamped into the image**, not read from a manifest:
  the release build receives the release number as `version`, passed on as `ARG APP_VERSION`,
  which becomes `APP_VERSION` in the environment and is validated by `apiEnvSchema`. A build
  that is not a release (a `main` push with no releasable commits, a version-less manual run)
  leaves it unset, `VersionInfo.current` is `null` and the overview card renders `N/A`;
  outside production it reads `development`. A malformed value is dropped rather than failing
  boot. Never read a `package.json` version at runtime — the root `package.json` version is
  kept in step with the release by semantic-release, but the `apps/*` and `packages/*`
  manifests stay at a placeholder, and the app only ever learns its version from `APP_VERSION`
  in the image.

```bash
pnpm install                # install workspace
pnpm dev                    # turbo: build contracts, then run both dev servers
pnpm build                  # turbo: build every workspace
pnpm typecheck              # turbo: tsc --noEmit everywhere
pnpm test                   # turbo: unit tests (fast, no infra)
pnpm test:e2e               # turbo: e2e tests (need Postgres + Redis)
pnpm check                  # Biome: lint + format (read-only, CI gate)
pnpm check:fix              # Biome: autofix lint + format + organize imports
```

Filter to one workspace with `pnpm --filter @snapshot/api <script>`.

Infrastructure and database:

```bash
docker compose -f compose.dev.yml up -d          # Postgres 17 + Redis 7 (needed for dev + e2e)
pnpm --filter @snapshot/api db:generate --name <concise_snake_case_name>
pnpm --filter @snapshot/api db:studio            # inspect the database
```

Migrations are applied **automatically at API startup**; never edit a generated
migration in `apps/api/drizzle/` — change the schema and regenerate. That folder is
committed and excluded from Biome. **Every migration must have a concise, descriptive
snake_case name supplied through `--name`; never keep Drizzle's random generated name.**
The baseline is named `init`; later names describe the schema change, for example
`add_upload_expiration`.

There is **no seed script**. Fill a dev instance the way a user does — upload through
ShareX or `curl` against `/api/uploads` with the API key. Anything that writes files and
rows behind the app's back has to be kept in step with the upload pipeline (ids, magic-byte
validation, dimension probing, the Redis index) and drifts out of it silently.

`UploadReconcilerService` reconciles disk and database at startup: it **imports** untracked
files it finds in `UPLOADS_DIR`, and only **warns** about rows whose file is missing — it
never deletes them, because an unmounted volume would otherwise wipe the table. So dropping
files in by hand works; removing them by hand leaves rows behind that you have to delete
yourself.

---

## 4. TypeScript & modules

- **`apps/api` + `packages/*` are NodeNext.** Relative imports **must carry the
  `.js` extension** (it resolves the compiled output):

  ```ts
  import { AppConfigService } from "./config/app-config.service.js"; // ✅
  import { AppConfigService } from "./config/app-config.service";    // ❌ won't resolve
  ```

- **`apps/web` is bundler resolution** (Next.js). Relative imports are
  **extensionless**, and internal modules use the `@/*` alias
  (`@/components/...`, `@/lib/...`) — never `.js` extensions there.
- Import from workspace packages by name, never by deep path:
  `import { uploadSchema } from "@snapshot/contracts";` ✅
- TypeScript is **pinned to 5.9.x** across the repo — do not bump to a major.
- Prefer `type`-only imports for pure types **except** where a class is used as a
  NestJS DI token (see §6).

---

## 5. Code style (enforced by Biome)

- Tab indent (width 4), double quotes, semicolons, trailing commas, **line width 140**.
  `.editorconfig` mirrors this; `biome.json` is the source of truth.
- Imports are auto-organized (`pnpm check:fix`) — don't hand-sort.
- **Biome does not touch `*.css`** (its parser can't read Tailwind v4 `@theme` /
  `@layer` directives) — CSS is excluded in `biome.json`; PostCSS/Tailwind own it.
- React components are `PascalCase` in `PascalCase`-exported files but still
  `kebab-case` filenames (`app-sidebar.tsx`, `nav-links.tsx`); JSX pages/layouts use
  default exports (Next convention).
- **Naming**
  - Files: `kebab-case` with a role suffix — `response.interceptor.ts`,
    `all-exceptions.filter.ts`, `app-config.service.ts`, `version.service.spec.ts`.
  - Classes / decorators: `PascalCase`. Variables / functions: `camelCase`.
    Constants: `SCREAMING_SNAKE_CASE`. Zod schemas: `camelCaseSchema`.
- Prefer small pure functions and early returns over nesting. No default exports
  in library code (Next.js pages/route conventions excepted).

---

## 6. API (NestJS) conventions

**Directory shape** (`apps/api/src`):

```
common/            cross-cutting: constants, decorators, exceptions, filters,
                   interceptors, logger, utils
config/            boot env ONLY — env.ts + AppConfigService
db/                drizzle schema, migrator, repositories        (DatabaseModule)
redis/             ioredis client + CacheService                 (RedisModule)
modules/           one folder per feature: account, auth, health, ids, links,
                   meta, resolve, runtime-config, uploads, …
main.ts · bootstrap.ts · app.module.ts
```

- **One feature per folder** under `modules/`. Cross-cutting concerns live in
  `common/`; infrastructure in `db/` and `redis/`. Don't dump everything in the
  app module.
- **Account settings** (username + theme/locale preferences) live in `modules/account/`
  (`AccountController` → `PATCH /api/account/{username,preferences}`), reusing `AdminRepository`
  and the **`PasswordHasher` that `AuthModule` exports**. Changing the username verifies the
  current password. `AuthAdmin` — and therefore `SessionData` — carries `theme`/`locale`,
  resolved fresh per request in `deserializeUser`, so a change reflects in every session at once.
- **Two different "configs" — don't mix them.** `config/` (`AppConfigService`) is
  the validated **boot env** (ports, URLs, dirs, credentials). The dashboard-managed
  **runtime config** is DB-backed and lives in `modules/runtime-config/`
  (`RuntimeConfigService`); the dashboard reads/writes it through `modules/config/`
  (`GET/PATCH /api/config`), where the API key is always **masked** (`toConfigView`)
  and `PATCH` takes the strict `configUpdateSchema`. There is **no config event bus**:
  consumers (ShareX, upload validation, embeds) read the runtime config on demand
  through the Redis-cached `RuntimeConfigService.get()`, so a `PATCH` applies live.
- `DatabaseModule` and `RedisModule` are deliberately **not `@Global`**: importing
  them explicitly makes Nest's init order deterministic, so migrations always run
  before anything reads a table.
- **Responses are enveloped** by `ResponseInterceptor` as
  `{ success, status, message, data }`. Set the message with `@ResponseMessage()`;
  opt a route out (raw body, e.g. file streams, health) with `@SkipEnvelope()`.
- **Errors:** throw `AppException` (carries an `ErrorCode` from contracts). The
  global `AllExceptionsFilter` renders the error envelope, maps Zod →
  `validation_error`, and puts the request id in the body + `x-request-id` header.
  Never hand-write an error response.
- **DI + decorator metadata gotcha (important):** a class injected via the
  constructor must be a **value import**, not `import type` — `emitDecoratorMetadata`
  needs it at runtime:

  ```ts
  import { Reflector } from '@nestjs/core';        // ✅ injected → value import
  import type { ApiEnv } from '@snapshot/contracts'; // ✅ pure type
  constructor(private readonly reflector: Reflector) {}
  ```

  Biome's `useImportType` is **disabled for `apps/api`** precisely so it can't
  rewrite these to `import type` and break DI at runtime. Keep injected imports as
  value imports.
- **Config:** read env only through `AppConfigService` (validated once at boot by
  `apiEnvSchema`). Never touch `process.env` in feature code.
- **Logging:** structured pino via `nestjs-pino`. Every mutating endpoint carries
  `@AuditAction('<domain>.<verb>')` (e.g. `config.update`, `api_key.rotate`,
  `auth.login`, `uploads.delete`) — the global `AuditInterceptor` logs
  `{ action, actor, requestId, method, path }` on success (actor is resolved **after**
  the handler, so login/setup capture the real username). Don't log audit lines
  ad-hoc. **Never log secrets** (passwords, API keys, cookies, tokens — they're in
  the pino redact list; keep them there).
- **Auth is native Passport, session-based** (`modules/auth/`) — opaque Redis
  sessions, **no JWT**. Rules when touching it:
  - Two global guards run on every route (registered as `APP_GUARD` in
    `AuthModule`): `AuthenticatedGuard` (requires a session unless `@Public()`) then
    `CsrfGuard`. Any new public route needs `@Public()`, or it 401s — that includes
    health/meta.
  - Cookie-authenticated mutations require the `X-CSRF-Token` header (csrf-sync
    synchronizer token, stored in the session). `CsrfGuard` auto-skips safe methods
    **and requests carrying a valid API key** (a custom header can't be forged
    cross-origin, so it is not a CSRF vector). There is **no blanket CSRF opt-out**:
    every route a session can reach sends its token, and the api-key carve-out is the
    only bypass. A route that needs both audiences takes `SessionOrApiKeyGuard` and
    nothing else — do not reintroduce a `@SkipCsrf()`-style decorator to "make upload
    work", which would disarm CSRF for the session half of the same route.
  - Upload clients authenticate with `SessionOrApiKeyGuard` (dashboard session **or**
    key), which compares the key in constant time (sha-256 + `timingSafeEqual`). Keys
    come from the runtime config.
  - Session bookkeeping goes through `SessionManagerService` (establish / rotate /
    logout) and `SessionRegistryService` (the `admin_sessions` index, list, revoke).
    Regenerate the session id on login and password change — never reuse it.
  - **Sign-in is two-step whenever TOTP is on.** `LocalAuthGuard` authenticates but must
    **not** call `logIn` — the controller decides. With a second factor enrolled it calls
    `SessionManagerService.beginMfaChallenge`, which regenerates the session and stores only
    `pendingMfa = { adminId, startedAt }`: passport never sees a user, so
    `AuthenticatedGuard` keeps every route at `401` and `/auth/state` still reports
    `authenticated: false`. `POST /auth/sign-in/mfa` verifies within `MFA_CHALLENGE_TTL_MS`
    (5 min) and only then logs in. `signInResultSchema` is therefore a **discriminated union**
    on `mfaRequired` — don't collapse it back into `SessionData`. The challenge response
    carries a fresh `csrfToken` because regenerating the session dropped the old one.
  - Sessions use a **separate node-redis client** (`SESSION_REDIS`, required by
    connect-redis 9), distinct from the app's ioredis (`REDIS`). Both point at the
    same server; keep session keys under `snapshot:sess:` / `snapshot:admin_sessions:`.
  - Passwords: `PasswordHasher` (argon2id) only; never hash inline. Credential
    checks for a missing admin still run a dummy verify (constant time).
- **Two-factor authentication** lives in `modules/auth/` (`MfaService`, `MfaController` at
  `/api/auth/mfa`) and is built from four small pure modules — `totp.ts` (over `otpauth`),
  `secret-cipher.ts`, `recovery-codes.ts`, and the `admin_recovery_codes` repository. Rules:
  - **The TOTP secret is encrypted at rest**, AES-256-GCM under a key HKDF-derived from
    `MFA_ENCRYPTION_KEY` (`deriveSecretKey`), so a stolen database dump alone yields no working
    second factor. Keep that key stable and separate from `SESSION_SECRET`; changing it fails
    **closed** — TOTP codes stop verifying, but independently hashed recovery codes still work.
    Never "fix" this by falling back to a plaintext secret.
  - **Enrolment is two-step.** `setup` stores an unconfirmed secret (`totp_secret` set,
    `totp_confirmed_at` null) and returns it once; only `enable` with a valid code flips it
    on. A mis-scanned QR code therefore cannot lock the single admin out. Nothing reads the
    secret back after `setup` — `MfaStatus` deliberately carries no secret.
  - **A TOTP code is single-use.** `matchTotp` returns the timestep it matched and
    `MfaService` claims `redisKeys.totpReplay(adminId, counter)` with `SET NX EX`; a losing
    claim is a rejection. Without that, a code intercepted inside its ±1-step window replays.
  - **Recovery codes are hashed with sha-256, not argon2** — same reasoning as the API key:
    they are 50 bits of freshly minted randomness, not a human-chosen secret, so stretching
    buys nothing and would hand a public endpoint a CPU-amplification lever. They are compared
    with `timingSafeEqual` and consumed by a conditional `UPDATE ... WHERE used_at IS NULL`,
    so a concurrent double-spend loses.
  - Every mutating route re-checks the **current password** (`setup`, `disable`,
    `recovery-codes`). Regenerating recovery codes additionally demands a live second factor;
    disabling two-factor also requires a valid TOTP or an unused recovery code in addition to the password.
  - `enable` also takes a **`label`** (`totpLabelSchema`, 1–64 chars) — the operator's own name
    for the app they enrolled ("Bitwarden"). It is stored on the admin row and is the only
    thing `MfaStatus` exposes about the credential besides its timestamps.
- **Stats** (`modules/stats/`) serves the dashboard three reads: `GET /api/stats/overview`
  (lifetime totals), `/api/stats/activity?days=` (a daily series) and `/api/stats/breakdown`
  (storage per extension). All three go through one `cached()` helper that re-validates the
  Redis payload against its schema and drops it when an older build's shape comes back.
  Buckets are **UTC calendar days** — the dashboard formats every date in UTC, so anything
  else makes the axis disagree with the tooltip. `activity` fetches **two windows in one
  query** (the range plus the equally long one before it) and splits them with the pure
  `buildActivityPoints`, which also materialises empty days: a grouped row only exists where
  there was traffic, and a gap must render as a zero rather than a missing tick.
- **Two upload limits, both enforced while the request is in flight.** `maxFileSizeBytes` is a
  busboy limit, so an oversized body never lands on disk; `maxTotalStorageBytes` (nullable, off
  by default) is read once per upload and checked twice — before streaming, and again against
  the written size — before the row is inserted, answering `507 storage_limit_reached`. Two
  concurrent uploads can still cross the line by one file between them; that is deliberate,
  because the alternative is a lock on the hot path for a limit that is advisory by nature.
- **The dashboard rate limit is enforced by `WriteRateLimitGuard`** (`common/guards/`) on every
  route that creates something on the operator's disk or namespace — today `POST /api/uploads`
  and `POST /api/links`. It is a fixed Redis window (`snapshot:ratelimit:write:<window>:<client>`)
  whose limit and window come from the runtime config, so a `PATCH /api/config` applies live.
  It guards **writes, not reads**: never put it on a `GET`, or a dashboard page load spends the
  visitor's budget. It lives in `common/` rather than the uploads module precisely because it is
  not an upload concern — and that is why its dashboard page is `/rate-limit`, last in the
  Settings group, rather than a card on `/uploads`. The client is
  the **same salted, daily-rotated IP hash** view tracking uses, so the limiter never stores an
  address; the window length is part of the key, so changing it starts a clean bucket. The
  auth throttles (`sign-in`, `setup`) are separate, fixed and `@nestjs/throttler`-backed — they
  protect the credential, not the bandwidth. **A config key that nothing enforces must not
  exist**: `uploadChunkSizeBytes` and `sharexConfigEnabled` were removed for exactly that
  reason. Dropping a key from `runtimeConfigSchema` is safe — the schema strips unknown keys,
  so the orphan `config` row is simply ignored.
- **One id namespace, one generator, one place to configure it.** Uploads and short links both
  live at `/:id`. The generator itself is **pure and lives in `packages/contracts` (`ids.ts`)**
  — `generateId` / `generateUnreservedId` over the Web Crypto API, so the API and the dashboard
  preview run the identical code. Do not re-implement it per app, and do not reach for
  `node:crypto` there; `crypto.getRandomValues` is a web standard Node 24 also has.
  - **A renamed config key is split at boot, not migrated in SQL.** `config` is a jsonb
    key-value table, so `RuntimeConfigService.seedMissingDefaults` is the whole migration path:
    it seeds any key the defaults have and the table lacks, and `splitSharedIdConfig` first
    copies a pre-split `id_alphabet` / `id_min_digits` / `id_min_symbols` into both feature
    shapes before `deleteMany` drops the old rows. Carry a value over rather than reseeding a
    default — an operator's tuned alphabet must survive the rename.
  - **Thumbnails are derived files, generated once and owned by the upload.** `ThumbnailService`
    shells out to **ffmpeg** (one frame, `-ss 1` with a `-ss 0` retry for clips shorter than a
    second, scaled to `THUMBNAIL_MAX_EDGE` with `scale='min(640,iw)':-2` so nothing is upscaled,
    encoded WebP) into `uploads/thumbnails/<id>.webp` — same volume as the originals, so one
    backup covers both and `StorageService.listFiles` skips the directory because it only walks
    files. What is thumbnailable lives in **one** place, `supportsThumbnail` plus the
    `THUMBNAIL_MIME_*` constants in contracts, which `UploadRepository.findMissingThumbnails`
    also builds its SQL filter from — never restate "video or gif" anywhere else. Generation is
    synchronous on upload but never fatal: a failure logs, returns `false` and leaves
    `has_thumbnail` false, and `ThumbnailBackfillService` (fired, not awaited, from
    `UploadBootstrapService`) retries every row on the next start, which is also how an existing
    library and a newly installed ffmpeg catch up. ffmpeg missing is a warn at boot, not a
    crash. `/raw/thumbnail/:id` serves it — under `/raw` deliberately, because a new top-level
    prefix would force every operator to touch their nginx — and it does **not** track a view:
    browsing the gallery must not inflate an upload's raw counter.
  - **`IdAllocatorService`** (`modules/ids/`) is the only thing that hands ids out. It owns the
    whole namespace: `occupantOf` answers `reserved | upload | link | null`, `assertAvailable`
    turns a taken id into `409 slug_unavailable`, and `allocate` draws, checks, and **retries up
    to `MAX_RETRIES` (10) times** before giving up with a 500 that says to raise the id length
    (it takes an optional extra predicate — uploads use it to also check the disk). The cap is
    not a safety net for a mis-sized keyspace: at the shipped defaults a collision is already
    astronomically unlikely, so exhausting eleven draws means the alphabet or length is wrong,
    and failing loudly beats spinning. Never check
    only your own table: a custom slug colliding with an upload id would be silently shadowed by
    whichever the resolver prefers. **Uploads win that precedence**, which is exactly why the
    collision is refused at creation time instead. `GET /api/ids/:id` exposes the same check to
    the dashboard, behind auth — unauthenticated it would be an upload-enumeration oracle.
  - **The id shape is runtime config, once per feature.** Uploads and short links each own a
    full shape — `uploadIdAlphabet` / `uploadIdMinDigits` / `uploadIdMinSymbols` /
    `uploadIdLength` and the `linkId*` four — because each is configured on the settings page of
    the thing it addresses, and a page that only half-owns its rules is a lie. Never read the
    four fields by hand: `idShapeFor(config, "upload" | "link")` in `contracts/config.ts` is the
    one way to build an `IdShape`, and `ID_CONFIG_FIELDS` / `ID_LENGTH_BOUNDS` name the fields
    and bounds for both. One generator still serves both. Characters are restricted to
    `A-Z a-z 0-9 - _` and the alphabet must
    resolve to ≥8 distinct characters. **A dot must never enter it**: `parseUploadFilename`
    splits `id.extension` on the last dot, so a dotted id makes `/raw/:filename` ambiguous.
    `RESERVED_IDS` covers the whole namespace, not just files — it keeps an issued id from
    shadowing a dashboard route.
  - **The minimums are enforced by sampling, not by patching characters in afterwards.**
    `idCompositionWeights` enumerates how many digits/symbols an id may hold and weights each
    composition by how many strings it represents; the generator picks a composition against
    those weights, then shuffles. That makes the draw **uniform over exactly the valid strings**,
    which is what lets the dashboard state a truthful entropy — `idCombinations` is the same sum.
    A place-then-append shortcut would be simpler and would make that number a lie. A minimum for
    a class the alphabet does not contain is silently dropped (`effectiveIdMinimums`), so the UI
    disables the field rather than inventing an impossible state.
  - **`runtimeConfigSchema` is a refined object, so keep the plain shape around.** The
    length-fits-the-minimums rule is a cross-field `superRefine`, and `.omit()`/`.partial()` do
    not exist on a refined schema — `configUpdateSchema` and `configViewSchema` derive from the
    bare `runtimeConfigShape`. A partial `PATCH` therefore cannot be cross-validated on its own;
    `RuntimeConfigService.update` `safeParse`s the **merged** config and raises a
    `400 validation_error`, because a bare `ZodError` escaping there would render as a 500.
- **Short links** (`modules/links/`) are CRUD over `links` + a `link_visits` log, reachable
  with a session **or** an API key (`SessionOrApiKeyGuard`) so another service can create them.
  The visit count is **counted from the log**, never stored on the row; only the slug→target
  resolution is cached (`redisKeys.link`), invalidated on update and delete. There is no
  `@SkipCsrf()` here: a dashboard mutation still needs its token, while `CsrfGuard` steps aside
  for a request that carries an API key.
- **The audit log (`modules/audit/`) is the instance's own record, and `AUDIT_ACTIONS` in
  `contracts/audit.ts` is the whole vocabulary.** One `as const satisfies` table maps every
  action to its severity, its optional escalated `failureSeverity` and the kind of thing it
  touches; `auditCategoryOf` reads the category straight off the `<category>.<verb>` name and
  `auditSeverityFor` resolves the severity from action + outcome. Adding an event means adding
  a row there, and the whole stack — DB enum, filters, colours, copy — follows. Rules:
  - **The row is a record, not a rendering.** `severity` is stored because it is the judgement
    made when the event happened; `category` is **not** stored because it is literally the
    action's prefix, and a category filter expands to `action IN (…)` against the
    `(action, occurred_at desc)` index instead. No human prose is stored either — the action
    enum plus `metadata` is the record, and the dashboard renders it localized, so switching
    language does not leave half the history in English.
  - **There is no username in an audit row.** Snapshot is single-admin; `actor` says *how* the
    request arrived (`dashboard` · `api_key` · `system` · `anonymous`), which is the part that
    actually distinguishes two events.
  - **The audit log stores the real `ip_address` and `user_agent`; view tracking still hashes.**
    They are different subsystems answering different questions. View tracking counts *public
    visitors* browsing shared uploads, so an address there is third-party data with no purpose
    beyond a counter — it stays a salted, daily-rotated hash. The audit log answers "who
    reached my admin surface, from where, with what" — a hash cannot tell the operator whether
    a refused sign-in came from their own laptop or from Belarus, which is the entire reason to
    open the page. Never "harmonise" these two by hashing the audit column.
  - **An interceptor only sees what reaches the handler.** Nest runs guards *before*
    interceptors, so a rejection by `LocalAuthGuard`, `CsrfGuard`, `SessionOrApiKeyGuard` or
    `WriteRateLimitGuard` never reaches `AuditInterceptor` — and a refused sign-in is the most
    valuable line in the whole log. Each of those records itself; the interceptor covers the
    rest. `LocalStrategy` is where a wrong password is recorded, because that is the only place
    that knows the credential failed.
  - **An extractor must never change the response.** `@AuditAction`'s `id`/`metadata` callbacks
    run through `safely()`, which swallows anything they throw: on the error path the handler's
    result is `undefined`, so an extractor written against it (`(result as Link).slug`) throws
    — and without the guard that turned a `409 slug_unavailable` into a `500`.
  - **Writing must never block a request.** `AuditService.record()` is synchronous, cannot
    throw, and appends to a bounded in-memory buffer that a 1s timer or a full batch drains
    with one multi-row insert; `error`/`critical` flush immediately, and shutdown drains what
    is left. A full buffer or a failing insert increments a drop counter that becomes a single
    `system.audit_overflow` row — the log says when it lost something rather than lying.
  - **Metadata is redacted at the boundary, not at the call site — which is what lets a route
    log its whole request body.** `sanitizeAuditMetadata` keeps primitives and string arrays,
    serializes a nested object to compact JSON, truncates, caps the key count, and rewrites any
    key that looks like a credential to `"[redacted]"`. `config.update`, `account.*` therefore
    pass `requestBody(request)` straight through: the log says the language became `de`, not
    merely that "preferences changed", and `currentPassword` still never lands in the table.
    A log that records *that* something changed without *what* is not an audit log.
  - **The reader is session-only.** `AuditController` carries no `SessionOrApiKeyGuard`, so the
    global `AuthenticatedGuard` closes it to API keys: a leaked ShareX key must not be able to
    read the instance's security history.
  - **Growth is bounded by `auditRetentionDays`** (runtime config, default 90), pruned at boot
    and every 24h by `AuditRetentionService` with one `DELETE … RETURNING` wrapped in a
    counting CTE. Without a retention the table is the one thing in Snapshot that only ever
    grows.
- **`GET /api/resolve/:id` (`modules/resolve/`) is the public entry to the shared namespace**
  and the only thing the web share route calls. It returns a discriminated union
  (`resolvedIdSchema`) so one round trip both renders an upload page and redirects a short
  link, and it is what tracks the page view / link visit. Don't give the web app a second
  lookup that resolves ids — the tracking would double-count.
- **`CsrfGuard` judges a request that carries an API-key header by that key alone.** A wrong
  key answers `401 unauthorized` instead of a misleading CSRF `403`; a request with neither a
  key nor a token still gets the `403`. This is not a carve-out: a cross-origin page cannot set
  `Authorization` or `X-API-Key` at all, so the header's *presence* is already the proof CSRF
  protection is looking for, and the change only ever swaps one rejection for another.
- **Image dimensions are parsed in-repo** (`uploads/image-dimensions.ts`), not by a
  dependency. `image-size` carried two unfixable DoS advisories (its ICNS/JXL/HEIF parsers
  loop forever) and Snapshot only ever stores six image formats, so the parser dispatches on
  the **already magic-byte-detected** MIME type rather than sniffing, and every loop in it is
  bounded (`MAX_JPEG_SEGMENTS`, `MAX_TIFF_ENTRIES`, explicit length checks). Do not reach for
  a sniffing library again: content-driven format detection is exactly the attack surface this
  removed.
- **Uploads** (`modules/uploads/`) stream through **busboy** to a temp file, then
  `StorageService.commit` renames it into place atomically (`tmp → rename`). Validate
  in this order: extension → declared content-type → **magic-byte detected type**
  (`file-signatures.ts`); never trust the client's declared MIME alone. File ids come from
  `IdAllocatorService` (see above), unless the request carried the optional multipart
  `slug` field — then `UploadService.reserveId` parses it with `uploadIdSchema` and calls
  `assertAvailable`, so a custom id is refused (`409 slug_unavailable`) rather than
  shadowing a link or a route. `UploadWriterService` therefore resolves on busboy's
  **`close`**, not on the file stream's `finish`: a field may arrive after the file, and
  resolving early would drop it. The two field names live in contracts
  (`UPLOAD_FILE_FIELD` / `UPLOAD_SLUG_FIELD`) so the dashboard's `FormData` and the parser
  cannot drift. `/raw/:filename` is served
  outside the `/api` prefix (excluded in `configureApp`) with an immutable cache +
  checksum ETag. View tracking is **fire-and-forget** (never blocks the response):
  Redis counters (warmed from the `upload_views` log at startup) + an async event row
  with a salted, daily-rotated `ip_hash`.
- **Snapshot stores media and nothing else, and that set lives in contracts.**
  `MEDIA_MIME_TYPES_BY_EXTENSION` (`contracts/uploads.ts`) is the single registry — every
  permitted extension and the MIME types its magic bytes may resolve to — with
  `MEDIA_EXTENSIONS`, `MEDIA_MIME_TYPES`, `mimeTypesForExtension`, `isMediaExtension` and
  `isMediaMimeType` derived from it. It sits in contracts rather than in the API because
  three consumers need the same answer: `UploadValidatorService` (the defaults when the
  operator restricts nothing), `extensionsCsvSchema`/`mimeTypesCsvSchema` (which now
  **refuse** a non-media entry, so the settings page cannot store a rule the pipeline would
  never honour), and the dashboard's `lib/upload-rules.ts` (the file picker's `accept` and
  the pre-flight check). Adding a format means adding it here, once — never restate the
  list, and never widen an allow-list past this registry: the magic-byte step would reject
  the file anyway and the operator would only see a confusing `invalid_content_type`.
  Because tightening a schema can strand a stored value, `narrowToMediaConfig` drops
  non-media entries out of `allowedExtensions`/`allowedMimeTypes` in
  `seedMissingDefaults` — same boot-migration path as `splitSharedIdConfig`. Fail-closed
  parsing there would take an existing instance down at start.

---

## 7. Contracts (`packages/contracts`)

- Add a schema next to its peers (`auth.ts`, `common.ts`, `config.ts`, `env.ts`, `ids.ts`,
  `links.ts`, `resolve.ts`, `stats.ts`, `uploads.ts`, `utils.ts`), export the schema **and**
  its inferred type, and re-export from `src/index.ts`. `ids.ts` owns everything shared by the
  `/:id` namespace (`idSchema`, `RESERVED_IDS`, `idAlphabetSchema`); `resolve.ts` exists purely
  because its union spans `uploads.ts` and `links.ts`.

  ```ts
  export const thingSchema = z.object({ id: uploadIdSchema, count: z.number().int() });
  export type Thing = z.infer<typeof thingSchema>;
  ```

- Zod is the **only** runtime dependency here. Keep it framework-free — no NestJS,
  no Next.js imports. It builds to dual ESM+CJS (tsdown); don't add Node-only APIs.
- Changing a schema is a contract change: update both apps and the tests.

---

## 8. Web (`apps/web`, Next.js 16)

- **No API routes in the frontend.** The API is only NestJS. Dev uses
  `next.config` rewrites to proxy `/api` + `/raw` → `:3001`; it is a transparent
  proxy, not an API layer. The edge middleware is **`src/proxy.ts`** (Next 16
  renamed `middleware` → `proxy`); it stays a thin wrapper around the **pure**
  `resolveGateRedirect` in `lib/auth-gate.ts` (unit-tested) which decides redirects
  from `GET /api/auth/state`.
  - **A new dashboard page touches four lists** — `navGroups` in
    `components/layout/nav-items.ts`, `DASHBOARD_ROUTES` in `lib/auth-gate.ts`,
    `config.matcher` in `proxy.ts`, and `RESERVED_IDS` in `packages/contracts`.
    The matcher is a hand-kept duplicate because Next reads it **statically** at build
    time, so it cannot be derived from the constant; miss it and the page ships
    **unauthenticated** while still looking gated. `RESERVED_IDS` matters because share
    pages and short links both live at `/:id` — an issued id equal to a route slug would be
    shadowed by the page. `test/unit/auth-gate.spec.ts` fails loudly on all three drifts.
  - **A sidebar label names one thing.** `navGroups` is **Overview** (alone, unlabelled) ·
    **Content** (`/gallery`, `/links`) · **System** (`/audit`) · **Settings** (`/uploads`,
    `/shortener`, `/rate-limit`) · **Integrations** · **Account**, and the route slug matches
    the label. **System** exists because the audit log is neither a thing you manage
    (*Content*) nor a rule you set (*Settings*) — it is the instance reporting on itself, and
    filing it under Account would have been a lie about its scope. The split is
    browse-vs-configure: **Gallery**/**Links** are the things, **Uploads**/**Shortener** are the
    rules. Overview sits alone above the groups because it is the landing page, not a category.
    A compound like "Limits & Types" reads as a sentence and describes two things — the group
    header carries the context instead. A single noun phrase that names one thing ("API key")
    is fine.
  - **Settings has one page per feature, and that page holds everything the feature owns.**
    `/uploads` carries size, file types, file-id generation and the embed unfurl;
    `/shortener` carries slug generation. There is no page for a single config section — an
    "Embeds" page reads as a config-key dump rather than a thing the operator has an opinion
    about. Adding a setting means finding the feature it belongs to, not adding a sidebar
    entry. **`/rate-limit` is the exception that proves it**: the limiter guards uploads *and*
    link creation, so it belongs to neither feature page — it is its own page, last in the
    Settings group, after the two features it protects.
  - **The overview's five cards answer "how big is my instance", in that order**: uploads,
    short links, storage, **views across both** (`views.total + links.visits`, which is why the
    card carries a hint saying so) and version. Do not put a second number on a card — the
    short-link card used to carry its visits and that only made the total card look wrong.
    **The views chart counts the same four things the total card does** — page, raw, download
    and `linkVisits`, which is why `sumTotals` folds link visits into `views`: a headline figure
    that disagrees with the card above it is worse than no chart.
  - **`RecentActivity` is one feed over two queries.** Uploads and short links are fetched
    separately (each API paginates its own resource), merged client-side on `createdAt` and cut
    to six. An upload row links to its share page, a link row to `/links` — never to the short
    URL itself, which would spend a real visit just to look at the dashboard.
  - **A stat is worthless without the words around it.** The delta line spells the comparison
    out (`25% more than the period before`, `0 in the period before`) rather than showing a bare
    percentage next to a phrase like "no previous period" — the reader should never have to
    infer what is compared against what. Same rule for a chart's description: the views card
    names what each series means (a share-page open, a direct file hit from a Discord preview,
    a download) instead of assuming the operator knows the vocabulary of the codebase.
  - **A gated route redirects with its destination attached.** `resolveGateRedirect` takes a
    `{ pathname, search }` and appends `?next=<encoded path>`; `SignInForm`, `SetupForm` and
    `MfaChallengeForm` land there instead of `/overview`, and a bounce between the two auth
    pages carries the parameter along. `safeRedirectTarget` is the only way in: it accepts a
    **relative** path whose pathname is in `DASHBOARD_ROUTES` and nothing else. An absolute URL
    would be an open redirect, and `//evil.example` / `/\evil.example` are protocol-relative to
    a browser — all three are rejected, so never loosen it to "starts with a slash".
  - **The API key is instance-wide, not a ShareX detail.** Every upload client authenticates
    with the same key (`Authorization: Bearer` or `X-API-Key`); ShareX is just the client
    that gets it pre-filled into its `.sxcu`. That is why it is its own page under
    Integrations rather than a card on `/sharex`, and why rotating it is worded as breaking
    *every* client. `sharex-card.tsx`'s preview must stay byte-identical to what
    `ShareXService.configFile` serves.
- **Auth routes are `/sign-in`, `/sign-out`, `/setup`** (no real sign-up — first-run
  is setup); the API actions mirror them (`POST /api/auth/sign-in` / `sign-out`).
  Auth flows go through `hooks/use-auth.ts` (mutations) → `lib/api/auth.ts`; on
  success they seed the Query cache and `router.replace`. Throttle (429) surfaces a
  countdown from `ApiError.retryAfter`.
  - **`SignInForm` owns the whole sign-in card, including its `AuthCard`**, because the
    second-factor step needs a different title. `useSignIn` seeds the session cache only when
    `mfaRequired` is false; `MfaChallengeForm` takes over otherwise.
  - **Every response that carries a `csrfToken` pushes it through `setCsrfToken`** — `signIn`,
    `verifySignInMfa`, `setupAdmin` and `fetchSession` in `lib/api/auth.ts`. The API regenerates
    the session on login and setup (Passport's `logIn` alone does), so the client's cached token
    is stale the moment the response lands. `setupAdmin` used to drop it: the first mutation
    after first-run setup then 403'd, `clientApi` silently re-fetched a token and retried, and
    the operator was left with a `security.csrf_rejected` warning in the audit log for a flow
    that never failed. The 403-retry is a safety net for a genuinely rotated token, **not** the
    way a known-new token reaches the client — a route that returns one and ignores it is a bug,
    and `test/unit/api-csrf.spec.ts` pins that.
  - **The one-time code control is `components/auth/code-input.tsx`, and it is one plain
    `Input`.** There is no segmented slot control and **no `input-otp` dependency** — it was
    removed because the trick that makes it look like six boxes is what broke autofill: the
    library overlays a single transparent `<input>` on a row of `<div>`s, and both browser
    autofill and password managers routinely mis-target or mis-measure that. A normal centred,
    `font-mono tracking-widest` text input with `autoComplete="one-time-code"` and
    `inputMode="numeric"` is filled correctly by everything. Do not reintroduce a slot control
    to make it look nicer. Two sizes: `default` (`h-9`, matching the name `Input` beside it in
    the enrolment dialog) and `lg` (`h-12 text-xl`) for the sign-in card, where the code is the
    only field.
  - **`CodeInput` owns completion, and adopts fills it did not see.** A password manager writes
    the code by setting `input.value` directly; React's value tracker treats that as "no change"
    and swallows the event, so the field stayed empty while Bitwarden happily reported a fill.
    A native `input`/`change` listener on the element reads the DOM value in a microtask and
    pushes it through `onChange` when it disagrees with state — keep it even though the control
    is now a plain input, because the tracker problem is React's, not the library's. Completion
    is an effect on `value`: it fires `onComplete` once when the code becomes full and re-arms
    when it shrinks, so a fill and a typed code behave identically.
  - **`Button` is `whitespace-nowrap`, so a long localized label silently widens a grid form.**
    `MfaChallengeForm` is a `grid`; a nowrap child's min-content size floors the track, and the
    German "Stattdessen Wiederherstellungscode verwenden" pushed that track 8px past the card's
    padding box — every sibling, the code row included, inherited the overflow, which is what
    made the code field look like it was eating the card padding. The recovery-code action is an
    `outline` button with `whitespace-normal max-w-full h-auto`, centred under an "or" rule, so
    it wraps rather than dictating the form's width. The rule's label sits on `bg-card`, not
    `FieldSeparator`'s `bg-background` — the two tokens are the same colour in light mode and
    differ in dark, so `bg-background` would punch a darker notch through the line inside a card.
  - **The enrolment dialog does not submit itself when the sixth digit lands.** The name field
    sits beside the code and is still editable at that point, so a complete code arms the
    button rather than pressing it. `MfaChallengeForm` *does* pass `onComplete` — there the
    code is the only field and there is nothing left to reconsider.
  - **Recovery codes are numbered wherever they are shown or written.** `AB123-CD456` reads as
    two codes split by a dash otherwise — the number is what makes one line one code. The
    downloaded file right-aligns them so they line up in a monospace viewer, and states the
    count and "one per line" above the block. `test/component/recovery-code-list.spec.tsx`
    reads the generated Blob back and asserts that shape.
  - **One sanitizer owns the digit rules**, and it runs on the way *in*: `digitsOnly` strips
    every non-digit and slices to `CODE_LENGTH`, so a typed letter, a pasted `123 456` and a
    manager's padded fill all land as the same six digits. It fires `onChange` only when the
    result actually differs, or a rejected keystroke would re-render for nothing; React restores
    the DOM value from state either way. There is deliberately **no `maxLength`** — it constrains
    typing, which the slice already does, and browsers apply it to autofill too, which would
    truncate a padded fill to five digits.
  - **`MfaCard` is one panel in both states**, not a table — there is exactly one authenticator,
    so a list with a single row is noise. The same bordered block carries the icon, the app's
    name (or "Authenticator app" when off), an active/inactive badge and a secondary line
    (added-on date, or why you want it); enabled, it grows a footer strip with the recovery-code
    count, tinted destructive at zero. The actions sit **below** the panel as plain buttons —
    both are password-gated, so hiding them in a `⋯` menu buys nothing and costs a click.
  - **The auth screens carry no theme control at all.** Signed out there is no session to
    persist a preference to, so `/sign-in` and `/setup` render `system` — the same default a
    fresh account gets — and the theme is editable under **Account → Appearance** once there is
    a session behind it. Do not put a switch back on those screens: it can only write to
    `next-themes`, and `PreferencesSync` reconciles from the DB on the next load, so the choice
    silently disagrees with itself the moment the user signs in.
  - **The five `--severity-*` tokens** (globals.css section 2, both modes, mapped into
    `@theme inline` so `text-severity-warning` and friends exist) are the second deliberate
    addition to preset `bIkeymG`, for the same reason as `--strength-*`: the preset is
    monochrome and cannot say info-to-critical. `SEVERITY_STYLES` in
    `components/audit/audit-tokens.ts` is the one place an audit severity turns into an icon,
    a text colour, a tinted surface and a row rail — never restate that mapping in a component.
    Severity and outcome are **separate colour axes** (a *notice* that failed and an *error*
    that succeeded are different facts), so outcome has its own `--outcome-success` token and
    reuses `--destructive` for failure. Outcome is stated in the **detail panel only** — the
    collapsed row would otherwise carry a badge on every line to say "nothing happened", and a
    failure already announces itself there because `auditSeverityFor` escalates it to at least
    `warning`, which colours the icon and the rail.
  - **A row is a table, not a sentence.** Each column holds one kind of thing — event ·
    resource · route · outcome · time — so the eye can scan straight down. The earlier design
    put `filename · size · dimensions` under one action and `POST /api/links` under the next,
    which reads as noise because the same slot meant different things. Facts that are neither
    identity nor route (size, dimensions, destination) belong in the detail panel, where
    `MetadataFields` renders every key as a **labelled** field via `audit.fields.*`, falling
    back to the raw key. Do not put a raw JSON dump back in its place.
  - **A value shared between a page and a client component lives in a module with no
    `"use client"`.** `DEFAULT_AUDIT_RANGE_HOURS` briefly sat in `audit-toolbar.tsx`; importing
    it from the RSC handed the server a *client reference* rather than the number, so
    `Date.now() - undefined` rendered `Invalid time value` at request time — a runtime crash
    neither typecheck nor `next build` catches, because the module graph is legal and only the
    value is missing. Constants and pure helpers that both halves need go in `lib/`
    (`lib/audit-range.ts`); a `"use client"` module may export components to a page and
    nothing else.
  - **`/audit` is one client-filtered list over two queries** — the page and the summary share
    the same `AuditFilters` object, so the severity tiles double as filters and the counts
    always describe the list below them. The SSR prefetch hands the client its `from`
    timestamp as `initialFrom` rather than each side computing "7 days ago" independently: two
    `Date.now()` calls milliseconds apart produce different query keys and the hydrated cache
    would be missed on every load.
  - **The password meter's four `--strength-*` tokens** (globals.css section 2, both modes)
    are a deliberate addition to preset `bIkeymG`, which is monochrome and cannot express
    weak-to-strong. `PasswordStrength` animates width and colour together; the bar itself is
    `aria-hidden` and the live text carries the meaning. `lib/password.ts` takes its length
    rule from `PASSWORD_MIN_LENGTH` in contracts — never hard-code the number again.
- **Version status and update notice are two surfaces, and they answer different questions.**
  The overview's **version card** (`components/dashboard/version-card.tsx`) always states where
  the instance stands — the number, plus a hint reading either "up to date" (`--outcome-success`)
  or "{latest} available" (`--primary`). It is fed the `version` block the overview payload
  already carries, so it stays one query and one card. "No news" is a real answer an operator
  wants: a card that only speaks up when something is wrong leaves you unable to tell *checked
  and fine* from *never checked*. Which is why the hint is **omitted entirely when `latest` is
  null** — a failed GitHub check, or any non-production build — rather than defaulting to "up to
  date", and why the notice below is a separate thing rather than the card growing an alarm.
  Pass `undefined` for that case, not an element that renders `null`: `StatCard` tests the prop's
  truthiness, so an always-truthy element would leave an empty 8px hint row on every card.
- **The update notice is dashboard chrome, not an overview widget.**
  `components/layout/update-notice.tsx` sits in the `(dashboard)` layout above `PageHeader`, so
  every page carries it, mobile included — the sidebar footer would have hidden it behind the
  menu sheet on a phone. It renders **only when an update is available**: a permanent "you are
  current" bar on every page is noise, and that state is the version card's job. It reads `GET /api/meta` (`hooks/use-meta.ts`, `queryKeys.meta`,
  prefetched by the layout alongside the session) rather than `GET /api/stats/overview`: the
  overview payload also carries `version`, but pulling lifetime totals on every page to learn a
  version number is not a trade worth making. That endpoint is `@Public()` and stays that way —
  it is the "Snapshot is running" identity route; the notice is behind the auth gate because the
  layout is, not because the data is secret. The link is built from the response's own
  `repository` (`…/releases/latest`), so the repository URL keeps living in the API's
  `common/constants.ts` and is never restated in the web app.
  - **It renders nothing outside production.** `VersionService` reports `current: "development"`
    and `updateAvailable: false` unless `isProduction`, and the version is stamped into the image
    as `APP_VERSION` — so a dev server never shows the banner, and that is the design, not a bug
    to work around by faking a version locally.
  - **Dismissal is per-version and per-browser** — `localStorage["snapshot.update-dismissed"]`
    holds the version that was dismissed, so the notice returns on the *next* release rather than
    being silenced forever. It is the one piece of browser-persisted UI state in the app; every
    other preference is a DB-backed account setting. Both the read and the write are
    `try`/`catch`ed (a locked-down browser throws on access), and the read happens in an effect
    with the notice rendering `null` until it has run — reading storage during render would make
    the server's markup and the client's first pass disagree.

- **The masthead height lives in three places** — the mobile bar and `SidebarHeader` in
  `app-sidebar.tsx` and the `<header>` in `top-bar.tsx` (currently `h-16`). They sit
  side by side, so all three must move together or the bottom borders step where the
  sidebar meets the content column.
- **Account settings are pages, not a user menu.** Snapshot is single-admin and self-hosted.
  The sidebar footer is a **bare sign-out button** (`components/layout/sign-out-button.tsx`) with
  no group label. Admin settings live under the **Account** sidebar group as plain pages:
  `/profile` (username — the name shown in embeds), `/security` (password + sessions) and
  `/appearance` (theme + language). Do **not** reintroduce an avatar, a username chip or an account
  dropdown in the chrome.
- **Theme and locale are DB preferences** on the admin row, not just client state. They ride on
  `SessionData` (every sign-in/setup/`GET /api/auth/session` response) and are written through
  `PATCH /api/account/preferences` (`useUpdatePreferences` in `hooks/use-account.ts`). The dashboard
  layout prefetches the session and `components/layout/preferences-sync.tsx` reconciles the client
  caches — `next-themes` (localStorage) and the `NEXT_LOCALE` cookie — from the DB on load, so a
  preference survives a new device / cleared storage. **Smart read:** a concrete value wins;
  `'system'` defers to the OS (theme) or `Accept-Language` (locale, via `detectLocale` in
  `i18n/locale.ts`). `ThemeCard`/`LanguageCard` read the active value from the session.
- **Two typed API clients** over `packages/contracts`, both unwrapping the
  envelope and throwing `ApiError`: `lib/api/server.ts` (`serverApi`, RSC/SSR,
  forwards the session cookie, no cache) and `lib/api/client.ts` (`clientApi`,
  browser, same-origin, auto-attaches `X-CSRF-Token` and retries once on a rotated
  token). Never call `fetch` against the API directly. `clientUpload` in the same module is
  the one XHR exception, for upload progress only — it reuses that module's token handling
  and `fetcher.ts`'s `unwrapEnvelope`, so the envelope is still understood in one place.
- **Server state is TanStack Query — all of it.** Query keys come from
  `lib/query-keys.ts`. There is no client-state store: every remaining piece of UI state
  is local `useState` or a Base UI primitive's own state. If one is ever needed, add the
  store then — and never put fetched data in it.
- **Server vs client components:** default to Server Components; add `'use client'`
  only for interactivity/hooks.
- **SSR prefetch + hydration is the data pattern.** A page (RSC) calls
  `getQueryClient()` (`lib/get-query-client.ts`, per-request via React `cache`),
  `prefetchQuery` with `serverApi` under a `lib/query-keys.ts` key, and wraps content
  in `<HydrationBoundary state={dehydrate(...)}>`. The matching client component reads
  the **same key** with `useQuery` + `clientApi` (hooks in `hooks/`). Skeleton +
  error-with-retry states are mandatory for every widget. Dates use next-intl's
  `useFormatter` (the request config sets a stable `now` + `timeZone: 'UTC'` so SSR and
  hydration agree).
- **i18n** via next-intl, **cookie-based (no locale in the URL)** — English default,
  German second. Add strings to both `messages/en.json` + `de.json`; switch via the
  `changeLocale` server action. No hard-coded user-facing strings; localize Zod
  errors too. `test/unit/messages.spec.ts` fails on a key present in one catalogue and not
  the other, on a blank value, and on a sidebar entry without a label or subtitle — a
  missing key does not break the build, it just renders the key path to whoever switched
  language. **Don't assert on copy in component specs** either; read it from `en.json` the
  way `foldable-settings-cards.spec.tsx` does, or an edit to the wording fails a test that
  is really about behaviour.
- **UI:** shadcn/ui on **Base UI** (`@base-ui/react`) in `components/ui/`, generated by
  the shadcn CLI from preset **`bIkeymG`** → style `base-vega`, base color `neutral`.
  The palette is that preset's **stock neutral scale** (`--radius: 0.625rem`), matching
  `https://ui.shadcn.com/r/colors/neutral.json` verbatim. There is **no tweakcn layer**
  and **no shadow / letter-spacing / `--spacing` customisation** — `shadow-*`,
  `tracking-*` and `--spacing` all resolve to Tailwind's own defaults, and
  `--destructive-foreground` does not exist (destructive buttons tint the background
  instead). `components.json` is **CLI-owned**; `app/globals.css` is **hand-maintained
  in a fixed section order** (next bullet). Never reintroduce a second theme system.
  **There is no Radix and no `form.tsx`.**
  - **Charts are shadcn `chart.tsx` over Recharts** (`ChartContainer` + `ChartConfig`; colours
    are referenced as `var(--color-<dataKey>)`, which `ChartStyle` binds to the config). It is CLI
    output, so `noDangerouslySetInnerHtml` joins the `components/ui/**` carve-out in `biome.json` —
    that block stays scoped to generated code.
    - **The five `--chart-*` tokens are the one deliberate departure from preset `bIkeymG`.** Its
      ramp is a monochrome *lightness* scale, which cannot give two series separate identities.
      They are now slots **1/2/3/7/8 (blue · orange · aqua · violet · red)** of the dataviz skill's
      reference categorical palette, **kept in that documented order** — the order is the
      colour-blindness mechanism, so never insert a hue out of sequence or hand-pick a value. Both
      modes were validated with `scripts/validate_palette.js` (dark is its own re-stepped set, not
      an automatic flip, because the charts sit on `--card`, not on `--background`); re-run it
      before changing any of the ten values, and restore them after any CLI regeneration.
    - Assignment: `--chart-1` uploads · `--chart-2` storage-by-format · `--chart-3` (with 1 and 2)
      the stacked view bands · `--chart-4` storage over time. `--chart-5` is unassigned. A chart
      with **one** series over nominal categories (the format breakdown) gives every bar the *same*
      hue — colouring each one differently would spend the identity channel restating what the axis
      label and bar length already say.
    - Marks follow one spec across every chart: bars capped at 24px with a 4px rounded data-end,
      2px lines, area washes at ~12% (stacked bands at 85%), and solid hairline gridlines.
    - **A stacked chart states its legend through `ChartLegendRow`, not Recharts' `ChartLegend`.**
      Recharts takes an area's legend swatch from its `stroke` (so a card-coloured separator stroke
      renders every swatch invisible) and orders entries by neither the stack nor anything readable.
      `ChartLegendRow` sits *outside* `ChartContainer`, so it takes the global `--chart-*` tokens —
      the container-scoped `--color-<dataKey>` vars do not resolve there.
  - **The overview's range filter is one row above the charts it scopes** — `ActivityCharts` owns
    the `days` state and every card inside it reads the same window, while the stat cards and the
    format breakdown stay lifetime figures outside that section. Switching range keeps the previous
    render at reduced opacity (`placeholderData`) rather than flashing skeletons. The control is
    `RangePicker`, a **segmented switch**: one recessed track over Base UI `RadioGroup` (so roving
    tabindex and arrow keys come from the primitive) with a thumb that translates by
    `activeIndex * 100%` — which only works because the track is an equal-width `auto-cols-fr`
    grid, so no measuring is needed. Hairlines between segments hide next to the thumb. Do **not**
    rebuild it as a row of `Button`s: with `variant="outline"` the selected range is invisible
    against the card until hovered, which is exactly what it replaced.
  - **The two Content pages share one shape**: a header row (a count on the left, the page's one
    primary action on the right), then the browsing surface, then dialogs. `/gallery` is
    count + **Upload**, `/links` is count + **New short link** followed by a search/sort row.
    Creating is a **dialog** on both, not an always-open form: a permanently expanded composer
    pushed the list below the fold and made the two pages look unrelated. Keep them in step — a
    change to one is a change to both.
  - **Manual upload is `UploadDialog`** (`components/gallery/upload-dialog.tsx`): a label-wrapped
    `sr-only` file input (so click, keyboard focus and drag-and-drop all land on one real
    control — never a `<div onClick>` with a hidden input beside it), an optional slug field with
    the shared `SlugAvailability`, and an XHR progress bar. It goes through
    **`clientUpload`** in `lib/api/client.ts`, not `clientApi`: `fetch` cannot report upload
    progress, so that one path is `XMLHttpRequest` — but it still shares `getCsrfToken`, the
    403-retry and `unwrapEnvelope`, so there is exactly one place that understands the envelope.
    Client-side validation is `lib/upload-rules.ts` against `useConfigView()`, mirroring the API's
    order (extension → declared type → size); it is a courtesy, never the gate — the API
    re-validates everything including the magic bytes.
  - **`SlugAvailability` (`components/ids/`) and `useIdAvailability` (`hooks/use-ids.ts`) are
    shared by both custom-slug fields.** The caller passes the predicate for its own namespace
    (`linkSlugSchema` for links, `uploadIdSchema` for uploads) — the two shapes genuinely differ,
    so the component must not hard-code either. Copy `ids.availability.*` is one catalogue, not
    one per feature.
  - **`/links` is a row list, not a table** (`links-list.tsx`): each row is a monogram tile from
    the destination host, the slug, the destination, visits and age, with a hover copy button.
    Sorting is `LinkSortMenu`'s five presets over the same `sort`/`order` query the API already
    takes — a sortable table header row cannot survive the responsive stack, and the presets say
    what the reader actually wants ("Most visits") instead of making them compose a field and a
    direction.
  - **The gallery is a measured masonry** (`upload-masonry.tsx`): columns come from a target tile
    width (`TILE_TARGET_WIDTH`), not from breakpoints, and `GallerySkeleton`'s `columns-[21rem]` is
    the CSS twin of that constant — move them together. **GIFs never animate in the grid**:
    `UploadThumbnail` decodes the first frame with `createImageBitmap` and paints a `<canvas>`
    (CSS cannot pause a GIF and an `<img>` always loops), falling back to the original if the decode
    fails. Animation is the detail dialog's job.
  - **`app/globals.css` has five numbered sections** — imports, `1. Variants`,
    `2. Design tokens`, `3. Theme`, `4. Base`, `5. Utilities`. Keep every colour in
    section 2 and nothing but token→namespace mapping in section 3; the CLI emits a
    flat file, so merge its output back into this order rather than appending.
    Section 5 (`no-scrollbar`, `scroll-fade*`, `shimmer*`) is local, not CLI output —
    never let a regeneration drop it.
  - **If a theme registry export is ever layered on** (`pnpm dlx shadcn@4.13.1 add
    https://tweakcn.com/r/themes/<id>`) it needs two fixups — the CLI writes both wrong
    for this repo:
    1. It inlines literal font stacks (`--font-sans: 'Inter', sans-serif`) into
       `@theme inline` *and* `:root`/`.dark`. Fonts load via `next/font/google` in
       `app/layout.tsx`, so `@theme inline` must map `--font-*: var(--font-*)` and the
       literals must be **deleted** from `:root`/`.dark` — a literal there competes
       with the next/font variable on the same `<html>` element and the loaded font
       silently never renders. Keep `--font-heading: var(--font-sans)` (card, dialog
       and sheet titles use it).
    2. It appends a **second `@theme inline` block** duplicating the first. Merge and
       delete the duplicate.
  - **The radius scale is multiplicative** — `--radius-sm: calc(var(--radius) * 0.6)`
    … `--radius-4xl: calc(var(--radius) * 2.6)`. It is **style-independent** (luma and
    vega ship identical `css`/`cssVars`; a style only differs in which steps its
    components reach for), so it survives both `apply` and a tweakcn `add`. Never swap
    it for shadcn's additive `calc(var(--radius) ± 4px)` form, which leaves
    `rounded-2xl/3xl/4xl` unbound to `--radius`.
  - **Switching style (`shadcn apply --preset <code>`) needs three fixups.** It rewrites
    every `components/ui/*` file — that part is the point — but also:
    1. It **rewrites `:root`/`.dark` and flattens `globals.css`**. For `bIkeymG` the
       token *values* it writes are the ones already in the file, so the palette
       survives — but the five-section order, the base layer (incl. the cursor rule)
       and all of section 5 do not. Restore `globals.css` + `layout.tsx` from git and
       re-merge by hand; the style contributes nothing else to them.
    2. It re-adds `@import "shadcn/tailwind.css"` **and** the `shadcn` runtime
       dependency. This repo is **ejected** (that CSS is inlined), and the dep drags in
       zod 3.25, which breaks `zodResolver`'s peer resolution — six forms stop
       typechecking and their specs fail to import. Restore `package.json` +
       `pnpm-lock.yaml`, then `pnpm install --force`: a plain `pnpm install` skips
       resolution and leaves the broken peer wiring in place.
    3. Re-apply the **local `sidebar.tsx` delta** below.
  - **`foldable-card.tsx` is the one local, hand-written component** in `components/ui/`
    (not CLI output — a regeneration never touches it, and the Biome carve-out below does not
    excuse it). `FoldableCard` is the collapsible card used across
    the dashboard: Base UI `Collapsible`, the whole header is the trigger (chevron rotates via
    the trigger's `data-panel-open`), `defaultOpen` defaults to **true**, and the panel
    animates `height` off `--collapsible-panel-height` with `keepMounted` so form state and
    SSR markup survive a collapse.
    **`FoldableCard` is for settings, not the overview** — collapsing earns its keep on a long
    form page; a dashboard widget is meant to be read at a glance, so overview cards are plain
    `Card`s.
  - **Local deltas in `components/ui/sidebar.tsx`** (the only hand-edits to CLI-generated files) —
    re-add both after any regeneration of that file:
    1. `Sidebar` takes optional `mobileTitle` / `mobileDescription` props feeding the
       `sr-only` `SheetTitle`/`SheetDescription`. `base-luma` shipped these; `base-vega`
       hardcodes English strings instead, which would drop the localized screen-reader
       labels `app-sidebar.tsx` passes.
    2. `sidebarMenuButtonVariants` gains a **`destructive`** variant (sign-out in the
       footer). It ships only `default` + `outline`, and the colour belongs in the variant
       table rather than as classes on the call site. Losing it is **silent** — cva returns
       nothing for an unknown variant value, so the button keeps working and merely stops
       looking destructive. `test/component/sign-out-button.spec.tsx` pins it (typecheck
       catches it too, since `variant` is a `VariantProps` union).
  - **`globals.css` must keep shadcn's base layer** — `shadcn apply --only theme,font`
    writes the tokens but *not* the rules that use them, and losing it is silent:

    ```css
    @layer base {
      * { @apply border-border outline-ring/50; }
      body { @apply bg-background text-foreground; }
    }
    ```

    The same layer carries the **pointer-cursor rule**. Tailwind v4's Preflight resets
    buttons to `cursor: default`, so every interactive control needs it back:

    ```css
    button:not(:disabled, [aria-disabled="true"]),
    [role="button"]:not(:disabled, [aria-disabled="true"]) { cursor: pointer; }
    ```

    `[role="button"]` covers Base UI's non-native buttons (`nativeButton={false}`), and
    the `:not()` guards keep disabled controls on the default arrow. It lives in
    `@layer base` on purpose — menu and command items that opt out with the
    `cursor-default` **utility** must still win, and the utilities layer outranks base.
    Never add `cursor-pointer` to a `components/ui/*` variant; this rule is the source.

    Without `* { border-border }`, Tailwind v4 borders fall back to **`currentColor`**, so
    every border and `divide-y` renders in the text colour (white in dark mode). Without
    the `body` rule the page still *looks* dark — that is only the browser canvas reacting
    to `color-scheme` — which is what hides the first bug. After any CLI regeneration,
    check a border resolves to the `--border` token and not to the foreground.
  - **Composition:** Base UI uses `render={<X />}`, *not* `asChild`. A **navigation**
    styled as a button uses `buttonVariants()` on the `<a>`/`<Link>` — `<Button
    render={<a/>} nativeButton={false}>` forces `role="button"` and would announce a
    link as a button.
  - **Forms:** react-hook-form `Controller` + `Field`/`FieldLabel`/`FieldError` from
    `components/ui/field.tsx`, against the **same** contract schema the API validates.
    Wire `htmlFor`/`id` to `field.name`, `data-invalid` on `Field`, `aria-invalid` +
    `aria-describedby` on the control.
  - **Overrides:** the preset is the only visual source. Put layout in wrapper
    elements; do not pass design classes (colors, radius, shadows, typography,
    padding) to a `components/ui/*` component.
  - `components/ui/**` is CLI-generated, so a few Biome a11y/`noArrayIndexKey` rules
    are scoped off for it in `biome.json` — that carve-out is for generated code only;
    never widen it to app code.
- **A modal backdrop needs `w-screen`, not just `inset-0`.** `position: fixed; inset: 0`
  resolves against the initial containing block, which **excludes** a classic scrollbar — on a
  scrollable page the dim and blur stop short and leave an unblurred strip down the right edge
  (measured: 985px of a 1000px viewport). `100vw` includes the gutter. Both `dialog.tsx` and
  `sheet.tsx` carry it; it is a local delta on CLI-generated files, so re-add it after a
  regeneration.
- **A dialog that takes input is a `<form>`**, with the primary action as its `type="submit"`
  button — pressing Enter in a field must do the obvious thing. `ConfirmDialog` follows the
  same rule even though it has no fields. Never wire the primary action to `onClick` alone.
- **Every password field ships a `UsernameHint`** (`components/auth/username-hint.tsx`): an
  `sr-only`, readonly `autocomplete="username"` input carrying the current username. Password
  managers need it to know *which* account a credential belongs to, and dialogs — which have
  no visible username field — are where they otherwise guess wrong. One-time-code fields use
  `autocomplete="one-time-code"` (that is what makes a manager offer the TOTP), the displayed
  TOTP secret uses `autocomplete="off"`.
- **Dates come from named formats in `i18n/formats.ts`**, passed to both `getRequestConfig`
  and `renderWithProviders`. next-intl ships **no** built-in named datetime formats, so
  `format.dateTime(date, "long")` throws `MISSING_FORMAT` at runtime — a class of bug typecheck
  cannot catch. Add a format there rather than inlining `Intl` options at a call site, and keep
  the test provider in step or every component spec that renders a date starts failing.
- **Settings forms** (`components/settings/`) follow one shape: an outer component
  reads `useConfigView()` and renders skeleton/`DashboardError`; the inner form takes
  the loaded `config`, seeds react-hook-form via the reactive **`values`** prop (so it
  re-syncs after a save), and shows the shared **`SaveBar`** only while
  `formState.isDirty`. On submit, the tab sends its own fields through
  `useUpdateConfig()` (write-through to the `config` query) → localized `toast`. Any
  `<form>` with number/constrained inputs sets **`noValidate`** so the Zod resolver —
  not the browser's native constraint popup — owns validation and shows localized
  `FieldError` messages. Reusable pieces: `SaveBar`, `ConfirmDialog`, `KeyField`,
  `ChipEditor`, `SettingsCard` (a `FoldableCard` with title/description and a
  `defaultOpen` pass-through — collapsing is free on every settings page), `OptionPicker`,
  `JsonCode` (theme-aware JSON syntax highlighting, no highlighter dependency),
  `SettingsSection` (the titled sub-block inside a card).
  - **A card header never carries a control.** Every settings card is a `FoldableCard` whose
    header *is* the Base UI `Collapsible.Trigger`, so a switch or button placed there would be
    an interactive control nested inside another one — and it would swallow the click that is
    supposed to fold the card. A card's master toggle is the **first row of the panel**
    instead: a `Field orientation="horizontal"` with its `FieldDescription`, then a
    `Separator`, then the rest. `UploadRulesCards` and `EmbedCard` both follow that shape.
  - **`EmbedCard` is one card, not two** (`embed-card.tsx`): the enable row, a separator, then
    a `lg:grid-cols-2` split with the configuration `SettingsSection` on the left and the live
    `EmbedPreview` on the right, stacking below `lg`. Its off state is spelled out where it is
    visible — the preview section swaps to `disabledHint` and dims — so the toggle at the top
    and the consequence at the bottom right stay connected. The locale/timezone pair uses a
    **container query** (`@container` + `@md:grid-cols-2`), not `sm:`, because that column is
    half-width on a wide viewport, where a viewport breakpoint would put two `SearchSelect`s
    side by side in half the space.
  - **`SettingsSection` is `content-start`.** As a grid item in a two-column card it gets
    stretched to the taller column's height, and without it the section's own rows — the
    title/description block included — spread to fill that height, which reads as a random
    50px gap under the shorter column's heading.
  - **The embed preview renders `{created_at}` through the same `formatCreatedAt` the API
    uses** (it lives in `contracts/uploads.ts` for exactly that reason, like `generateId`), so
    changing locale or timezone moves the preview. It once held a hard-coded German timestamp
    and silently disagreed with every setting above it. The sample date is a **fixed ISO
    constant**, never `new Date()`, or SSR and hydration would disagree; the web wrapper falls
    back to `en-US`/`UTC` because a half-typed timezone in the field would otherwise throw
    during render.
  - **One page, one form, one `SaveBar`.** A settings page that carries several cards keeps a
    single `useForm` in its `*-settings-form.tsx`, wraps the tree in **`FormProvider`**, and lets
    each card (`UploadRulesCards`, `IdGenerationCard`, `RateLimitCard`, `EmbedCard`) pull
    `useFormContext<ItsOwnValues>()` — never one `<form>` per card, or a page grows a stack of
    sticky save bars that each claim "unsaved changes". Each card module exports its value
    interface plus a `use*Fields`/`use*Schema` hook returning `ZodFields<TValues>` (and a
    `refine` when it has a cross-field rule); the page spreads those into one `z.object` and
    calls the refinements from its own `superRefine`. `ZodFields` (`lib/form-fields.ts`) is what
    keeps the merged schema inferring the real value type instead of `ZodRawShape`'s `unknown` —
    without it every refinement call needs a cast.
  - **`OptionPicker` is the pick-one control for a handful of fixed options** (theme,
    language) — a segmented row over Base UI `RadioGroup`/`Radio`, so roving tabindex
    and arrow keys come from the primitive rather than hand-rolled `onKeyDown`. Options
    are styled with `buttonVariants({ variant: "outline" })` plus `data-checked`
    overrides that keep the **default button hover** (`hover:bg-primary/80`) on the
    selected option — never re-style these as bespoke buttons, or dark-mode hover
    regresses to `bg-muted` (looks black on the white active chip). Reach for
    `SearchSelect` instead once the list is long enough to want filtering.
  - **Id generation is a card on the page that owns the ids, not a page of its own.**
    `IdGenerationCard kind="upload" | "link"` renders the same four `SettingsSection`s
    (composition · character groups or the custom alphabet · guaranteed characters · length,
    split by `Separator`s) on `/uploads` and `/shortener`, reading the shared `IdGenerationValues`
    (`alphabet`, `minDigits`, `minSymbols`, `idLength`) out of `useFormContext` — every control
    sits under a titled section, none directly under a card header. Its `useIdGenerationSchema`
    returns `{ fields, refine }` so a page can merge those fields into its own schema; the page's
    `toUpdate` is what maps `idLength` onto `uploadIdLength` or `linkIdLength`.
    `IdAlphabetField` holds `charsets` *and* `characters` at once (`IdAlphabetValue`) so
    switching mode does not discard the other draft, and `fromIdAlphabetValue` narrows that back
    to the contract's discriminated union on submit. The two modes are **radio cards**, not an
    `OptionPicker` row — each needs a sentence of explanation, which that control cannot carry.
  - **Length is framed as headroom, not as guessability.** `IdLengthField` is a `Slider` plus a
    small number input over the same `idLength` field (the slider carries its own `aria-label`,
    or the two controls collide as one accessible name), and `IdCapacity` below it answers what
    that buys: the example, the *number of possible ids*, and **`idCollisionHeadroom`** — the
    square root of the keyspace, which is where a repeat draw stops being theoretical. Entropy
    and the password meter's `--strength-*` ramp stay, demoted to one line, because a
    self-hosted operator cares first about running out of ids and only then about brute force.
    The example is drawn in an effect, never during render — it is random, so rendering it on
    the server would hydrate to a different string. `formatMagnitude` switches to `8.4 × 10¹⁷`
    past a million because `Intl`'s compact notation gives up above `10¹²` and starts printing
    hundreds of digits; `formatCompact` is the friendlier `916.1M` form for the headroom figure,
    and falls back to `formatMagnitude` past `10¹⁵`.
- **Public share page** (`app/[id]`) is the one route outside the auth gate — keep it out
  of `proxy.ts`'s `matcher`. It fetches `GET /api/resolve/:id` through a React
  **`cache()`**d helper so `generateViewport` + `generateMetadata` + the page share one
  call; that dedupe is load-bearing, because the API tracks a `page` view (or a link visit)
  per call. The route serves **both kinds of id**: an `upload` renders the share page, a `link`
  renders `LinkRedirect` — a short interstitial that names the destination and forwards from the
  client. It is deliberately not a server `redirect()`: a bare 307 hides where a short link is
  about to send someone, and there is no fallback when a browser blocks the hop. Both the link
  and the not-found branch answer `robots: noindex`, and the unfurl tags stay upload-only.
  Forward the visitor's `x-forwarded-for` / `user-agent` / `referer` so the view is
  attributed to the visitor rather than the SSR hop. The unfurl tags come from the
  API-rendered `upload.embed` (never the session-scoped config); the pure mapping lives
  in `lib/share-metadata.ts`. Dates use explicit `Intl` components — `dateStyle`/
  `timeStyle` cannot be combined with `timeZoneName`, and next-intl silently falls back
  to a raw `Date` string when a format throws.

---

## 9. Database (Drizzle + Postgres)

- `casing: 'snake_case'` (set in **both** `drizzle.config.ts` and the `drizzle()`
  call); lowercase snake_case identifiers everywhere.
- Relational, **no redundancy** — derived values (filename, aggregates) are
  computed/cached, never stored twice. FKs declare explicit `ON DELETE`.
- The `admins` row also stores dashboard **preferences** — `theme` and `locale` (`text`, default
  `'system'`). Read them smart: a concrete value wins, `'system'` defers to OS/`Accept-Language`.
- All DB access sits behind repositories in `db/repositories/`; **no drizzle type
  ever leaves `db/`**. Repositories return plain interfaces (`UploadRecord`, …).
- The `config` table is key/value: **snake_case keys, `jsonb` values**. The
  repository converts keys at the boundary (`toSnakeCase`/`toCamelCase`).
- Writing a JS `null` into `jsonb` must go through an explicit `::jsonb` cast,
  otherwise drizzle emits SQL `NULL` and violates `NOT NULL`. See
  `ConfigRepository.upsertMany`.
- Redis keys are built only via `redisKeys` in `redis/redis.constants.ts` — never
  interpolate a key inline. Application cache keys use the `snapshot:cache:` namespace.
  Upload metadata is bulk-read through `CacheService.getUploads`; startup replaces the
  upload index and view counters from Postgres rather than merging stale Redis state.
  View tracking updates the hot per-upload counter and a present overview aggregate
  atomically. The frequently requested initialized-auth flag is cached briefly, but admin
  records remain uncached so username, credentials and preferences are fresh per request.

---

## 10. Testing

- **Vitest.** Tests live in a package's `test/` folder, **never** co-located.
- **API:** `test/unit/**/*.spec.ts` (pure, no infra, run by `pnpm test`) and
  `test/e2e/**/*.e2e-spec.ts` (full app + real Postgres/Redis, run by
  `pnpm test:e2e`). They use separate vitest configs.
- **Hoist the CSRF token out of the request chain.** `await agent.post(...).set("x-csrf-token",
  await csrf())` races the `GET /api/auth/csrf` against the POST superagent has already begun,
  and the POST arrives with a stale session secret — a `403` that looks like a broken guard.
  Always `const token = await csrf();` on its own line first.
- e2e runs against an isolated `snapshot_test` database and Redis DB `1` (created
  by `test/e2e/global-setup.ts`), never your dev data. Each spec calls
  `resetDatabase()` + `resetRedis()` in `beforeAll`, and files run serially.
- **An e2e spec that writes files gets its own `UPLOADS_DIR`.** `resetDatabase()` clears
  Postgres but not the disk, and `UploadReconcilerService` *imports* untracked files at
  startup — so files a previous run left behind reappear as rows in the next one. `uploads`
  and `persistence` both `mkdtemp` into the OS temp dir and restore `process.env.UPLOADS_DIR`
  in `afterAll`.
- e2e specs boot with `await app.listen(0)` (never `app.init()`) and reach the app
  through `test/e2e/utils/http.ts` — `api()` for one-shot requests, `apiAgent()` when
  cookies must persist. Both halves matter on Windows: a non-listening server makes
  supertest listen and close around every request, and Windows resets a loopback socket
  the moment the server tears it down after a `Connection: close` response, before the
  client has read the response. Either one turns into random `read ECONNRESET` failures;
  the shared keep-alive agent in that helper is what removes them. Don't hand a spec a
  raw `supertest(...)`.
- `test:e2e` is **not cached** by turbo: its result depends on live Postgres and Redis,
  not just on the repo, so a cache hit would be a lie. `test` (unit) is cached.
- Run e2e via the root `pnpm test:e2e` (turbo, `dependsOn: ["^build"]`), not
  `pnpm --filter @snapshot/api test:e2e`: specs resolve `@snapshot/contracts` from its
  `dist`, and only the turbo task rebuilds it first. A stale `dist` surfaces as
  `400 validation_error` from DTOs whose schema quietly resolved to `undefined`.
- Prefer extracting pure logic (e.g. `planReconciliation`) so it can be unit-tested
  without infrastructure.
- **Contracts:** `test/**/*.spec.ts`.
- **Web (`apps/web`):** Vitest + Testing Library + jsdom (`vitest.config.ts`,
  `test/setup.ts`). `test/unit/**` for pure logic (`password`, `auth-gate`),
  `test/component/**` for React components via `renderWithProviders` (wraps
  `NextIntlClientProvider` + `QueryClientProvider`); mock `next/navigation` and
  `@/lib/api/*`. Extensionless imports + the `@/` alias (not `.js`).
- Cover every validator edge case and every security-critical path (auth guards,
  upload validation, config). In `apps/api`/`packages/*`, import source under test
  with the `.js` extension and a relative path into `../src` (or `../../src`).

---

## 11. Security (non-negotiable)

- Validate **every** input with Zod. Reject unknown fields on config updates
  (`.strict()`).
- Passwords: argon2id (`@node-rs/argon2`), costs from env, constant-time verify.
- Sessions: opaque, HttpOnly, `SameSite=Strict`, Secure in prod, cookie name
  prefix `snapshot`. Regenerate on login + password change.
- Uploads: extension + declared MIME + magic-byte checks, size cap while
  streaming, path-traversal-safe ids, atomic writes.
- Secrets never appear in logs or responses (API key is masked in reads).
- Visitor IPs in **view tracking** are stored only as salted, daily-rotated hashes. The
  **audit log** deliberately stores the real address and user agent — see §6; it is the
  operator's own security record and a hash would make it useless.

---

## 12. Git & definition of done

- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, …).
  Never commit or push unless asked; branch off `main` first if you do.
- **Before calling work done:** `pnpm check` + `pnpm typecheck` + `pnpm build` +
  `pnpm test` all green (and `pnpm test:e2e` where infra is available). New
  user-facing strings localized (en + de).
- Keep this file current: if you introduce or change a convention, edit AGENTS.md
  in the same change.

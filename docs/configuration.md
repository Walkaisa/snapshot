# Configuration

Snapshot splits settings in two, and the split is deliberate:

- **Boot environment** — infrastructure the process needs before it can start (where the
  database is, what secret signs sessions). Set once, in an env file; changing it means a
  restart.
- **Runtime config** — everything an operator tunes day to day. Lives in Postgres, edited
  in the dashboard, cached in Redis, and applies to the **next request** with no restart.

Anything an admin should be able to change without SSH belongs in the second group. The
API key in particular is *never* an environment variable — it is generated on first boot
and rotated from the dashboard.

## Which file

There are two env files and they never overlap. Each has exactly one reader:

| File | Read by | You need it when |
|---|---|---|
| `.env` | `docker compose` | You are deploying. `cp .env.example .env`, fill in four values. |
| `.env.local` | the API under `pnpm dev` | Never, unless you want to override a default locally. |

Neither file is committed — `.env.example` is the committed template. **Local development
needs no env file at all**: the defaults below already point at the Postgres and Redis
that `compose.dev.yml` starts.

`.env` is *only* for compose. It is not a second place to configure a dev machine, and a
dev machine's values do not belong in it. (If `.env.local` is missing, `pnpm dev` will
read `.env` as a fallback, so an old single-file setup keeps working.)

The web app is a separate Next.js process and reads `apps/web/.env.local` by Next's own
rules — that is where `NEXT_PUBLIC_BASE_URL` goes when you want it in development.

## Environment

Only four variables have to be set, and only for a deployment: `BASE_URL`,
`SESSION_SECRET`, `MFA_ENCRYPTION_KEY` and `POSTGRES_PASSWORD`. Everything else has a
working default.

### You set these

| Variable | Default | |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | **Required in `.env`.** The public origin. Every share, raw and delete URL is built from it — get this wrong and ShareX writes broken links. |
| `SESSION_SECRET` | dev placeholder | **Required in `.env`.** ≥32 chars, signs the session cookie. The dev default is *rejected* in production. |
| `MFA_ENCRYPTION_KEY` | dev placeholder | **Required in `.env`.** ≥32 chars, encrypts authenticator secrets. Keep it stable and separate from `SESSION_SECRET`. The dev default is *rejected* in production. |
| `POSTGRES_PASSWORD` | — | **Required in `.env`.** Compose-only: the password for the Postgres container, and what compose builds `DATABASE_URL` out of. |
| `SNAPSHOT_TAG` | `latest` | Compose-only: which image tag to run. |
| `BIND_ADDRESS` | `127.0.0.1` | Compose-only: the interface `:3000` and `:3001` are published on. `0.0.0.0` exposes them beyond loopback — only do that behind a firewall. |
| `LOG_LEVEL` | `info` | `trace` … `fatal`. |
| `SESSION_TTL_HOURS` | `24` | Sliding inactivity lifetime. |
| `SESSION_ABSOLUTE_TTL_HOURS` | `168` | Maximum session lifetime regardless of activity; must be at least the inactivity lifetime. |
| `ARGON2_TIME_COST` | `3` | argon2id cost. Raising it re-hashes passwords transparently on next sign-in. |
| `ARGON2_MEMORY_COST` | `65536` | In KiB. |
| `ARGON2_PARALLELISM` | `4` | |

### Wired up for you

Compose sets these on the container and `pnpm dev` defaults them to the local stack, so
they belong in an env file only when you run Snapshot some other way — outside compose,
against a database you host yourself.

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | `postgres://snapshot:snapshot@localhost:5432/snapshot` | Compose builds it from `POSTGRES_PASSWORD`; the default is what `compose.dev.yml` serves. |
| `REDIS_URL` | `redis://localhost:6379` | Same story. |
| `NODE_ENV` | `development` | Compose sets `production`, which turns on secure cookies and the `__Host-` prefix. |
| `PORT` | `3001` | API port. Ports are fixed: web `3000`, api `3001`. |
| `UPLOADS_DIR` | `uploads` | Where files land. Relative paths resolve against the API's working directory; compose sets `/data/uploads`. |
| `API_INTERNAL_URL` | `http://localhost:3001` | How the **web** app reaches the API (SSR + the dev proxy). Compose sets `http://127.0.0.1:3001`. |
| `NEXT_PUBLIC_BASE_URL` | — | Optional; only used to render URLs in the embed preview. Being a `NEXT_PUBLIC_` value it is read by Next, so in development it goes in `apps/web/.env.local`. |
| `APP_VERSION` | — | Stamped into the image at release build time. Never set it by hand. |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(36).toString('base64'))"
```

Two-factor authentication is a per-account setting — turn it on under **Account → Security**.
`MFA_ENCRYPTION_KEY` protects the stored authenticator secret and must remain stable. Rotating
`SESSION_SECRET` invalidates sessions without affecting the enrolled authenticator.

## Dashboard settings

Edited in the UI, stored in Postgres, applied live. There are two settings pages: **Uploads**
holds everything about an upload — size, file types, file ids, the rate limit and the embed —
and **Shortener** holds slug generation. The sections below follow that split.

### Uploads

| Setting | Default | |
|---|---|---|
| Max file size | 50 MB | Enforced **while streaming** — an oversized file never reaches the disk. Keep nginx's `client_max_body_size` at least this high. |
| Cap total storage | off | On = uploads are refused with `507` once the instance holds more than the limit you set. Off = only the free disk stops you. |
| Restrict extensions | off | Off = every media type Snapshot stores. On = only what you list, which can only be a subset of that. |
| Restrict MIME types | off | Same, for content types. |

Validation is always extension → declared content type → **magic bytes**, in that order.
A `.png` that is secretly an executable is rejected regardless of these settings.

**Snapshot is a media uploader.** Images and video are the whole permitted set; `.txt`,
`.pdf`, archives and anything else are refused whatever these lists say, and the settings
page will not let you add one. An older instance that had a non-media entry stored has it
dropped at the next start (with a warning in the log) rather than failing to boot.

### Audit log

| Setting | Default | |
|---|---|---|
| Keep entries for | 90 days | Set from the dropdown on **System → Audit log**. Older entries are deleted at start-up and once a day. |

The audit log is the only table that would otherwise grow forever, so the retention is not
optional — it is what keeps the page fast on a long-lived instance.

### Id generation

Upload ids and short link slugs come out of **one generator**, but each is configured on its
own page: file ids under **Uploads**, slugs under **Shortener**. Both pages show the same card.

| Setting | Default | |
|---|---|---|
| Characters | lowercase + uppercase + digits | Either a tick-list of predefined sets — lowercase `a–z`, uppercase `A–Z`, digits `0–9`, symbols `-_` — or an alphabet you type yourself. Duplicates are ignored. |
| Digits at least | 2 | How many digits every generated id must contain. Editable only while digits are part of the alphabet. |
| Symbols at least | 2 | Same for `-` and `_`. Inert with the default alphabet, which has no symbols. |
| File id length | 10 | 3–64 characters. |
| Slug length | 10 | 3–64 characters, and only for *generated* slugs — a custom one may be any length up to 64. |

Because the two are separate, short links can run a friendlier alphabet than uploads — drop
`0O1lI` for links people read aloud while uploads keep the full set.

Only `A–Z a–z 0–9 - _` are allowed and the alphabet must resolve to **at least 8 distinct
characters**. A dot is deliberately excluded: the id is a URL path segment, and `/raw/:filename`
splits `id.extension` on the last dot. Drag the length slider and the card answers what it buys
you: an example id, the **number of possible ids**, and the **headroom** — roughly how many ids
can be handed out before one draw repeats another. Both figures account for the guaranteed
characters, which shrink the keyspace slightly.

A repeat is not an outage: the API checks every drawn id against uploads, links and reserved
routes, and redraws up to ten times before it gives up with a `500` telling you to raise the
length. Running into that means the keyspace is far too small for how much you store.

Ids can never be issued for a reserved dashboard route, and never collide with an id the other
feature already holds.

### Thumbnails

Nothing to configure — every video and animated GIF gets a still frame on upload, and
anything already in the library is filled in the next time the API starts. The frame is
taken one second in (or at the very start for shorter clips), scaled to at most 640px wide
and stored as WebP under `uploads/thumbnails/`, so it lives on the same volume as the
originals and is deleted with them.

This needs `ffmpeg` on `PATH`. The published image installs it; if you run the API another
way and it is missing, the log says so on start and uploads keep working without thumbnails.
Install it, restart, and the backfill catches up.

### Shortener

Beyond the slug card above, short links have no settings of their own. Custom slugs are
always available, from the dashboard and from `POST /api/links`; the dashboard checks
availability while you type. Uploads and short links share the `/:id` namespace, so a slug
already held by a link, an upload or a dashboard route is refused with `409`.

Opening a short link does **not** redirect straight away: it renders a short interstitial that
names the destination and then forwards after a few seconds, with a button for anyone whose
browser blocks the automatic hop. That page is `noindex`.

### Rate limit

On the **Uploads** page.

| Setting | Default | |
|---|---|---|
| Enabled | on | Applies to `POST /api/uploads`. |
| Requests | 120 | Per window, per client. |
| Window | 60 s | |

Clients are counted by the same salted, daily-rotated IP hash used for view tracking, so
the limiter stores no visitor address. Over the limit the API answers `429` with
`Retry-After`.

Sign-in (10/min), setup (5/min), the second-factor challenge (10/min) and sensitive
reauthentication operations (5/min) are throttled separately and are not configurable.
Every auth limit has per-identity burst and sustained windows plus a separate IP window.

### Embed

On the **Uploads** page. Controls how links unfurl. The preview on the page renders exactly what Discord will show.

| Setting | Default | |
|---|---|---|
| Enable embeds | on | Off = links unfurl bare, with no Open Graph tags. |
| Provider name | `Snapshot` | The small line above the title. |
| Accent colour | `#5865F2` | The stripe down the left of the card. |
| Title template | `{filename}` | |
| Description template | `{size_human} \| {created_at}` | |
| Locale | `en_US` | Formats `{created_at}`, and becomes `og:locale`. |
| Timezone | `UTC` | Formats `{created_at}`. |

Template variables — **snake_case on purpose**, they are user-facing config, not API JSON:

`{id}` `{filename}` `{extension}` `{content_type}` `{size}` `{size_human}` `{created_at}`
`{provider}`

An unknown placeholder is rejected when you save. Should one ever slip through, it renders
verbatim rather than breaking the page.

### ShareX

| Setting | Default | |
|---|---|---|
| ShareX endpoint | on | Reflected as a badge on the ShareX tab. |

### API key

Generated on first boot, revealed and rotated from **Integrations → Keys**. It is masked
everywhere else — `GET /api/config` returns bullets plus the last four characters, and the
ShareX preview shows the mask, never the key. Rotating invalidates the old key
immediately, so re-download the `.sxcu` afterwards.

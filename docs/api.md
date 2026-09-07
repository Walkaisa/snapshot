# API

Everything lives under `/api`, except `/raw/:filename`, which is deliberately outside it so
your proxy can route media straight to the API. There is **no API version prefix**: this is
self-hosted software, so the deployment *is* the version.

Request and response bodies are Zod schemas from `packages/contracts` — that package, not
this page, is the source of truth.

## Envelope

Every JSON response is wrapped:

```jsonc
{ "success": true, "status": "success", "message": "Uploads returned", "data": { } }
```

Errors use the same shape, plus a stable machine-readable code:

```jsonc
{
  "success": false,
  "status": "error",
  "message": "File type is not permitted: .exe",
  "data": { "errorCode": "invalid_file_type", "requestId": "0b7e…" }
}
```

`requestId` also comes back as the `x-request-id` header and appears on every log line for
that request. Error codes: `validation_error`, `unauthorized`, `forbidden`, `not_found`,
`file_not_found`, `link_not_found`, `slug_unavailable`, `invalid_file_type`,
`invalid_content_type`, `file_too_large`, `file_empty`, `missing_filename`, `conflict`,
`rate_limit_exceeded`, `storage_limit_reached`, `internal_server_error`.

Two endpoints skip the envelope because their body is the payload: `GET /api/healthz` and
`GET /raw/:filename` (and `GET /api/sharex`, which is a file download).

## Audit log

| Method | Path | Auth | |
|---|---|---|---|
| `GET` | `/api/audit` | session | Paginated, filtered event list |
| `GET` | `/api/audit/summary` | session | Counts per severity for the same filter |

Both are **session-only on purpose** — an API key authenticates an upload client, and a
leaked one must not be able to read the instance's security history.

Every mutating endpoint, every refused request (bad API key, missing CSRF token, rate limit)
and the instance's own lifecycle land here. An entry carries the action, a severity
(`info` · `notice` · `warning` · `error` · `critical`), an outcome (`success` / `failure`),
how the request arrived (`actor`: `dashboard` · `api_key` · `system` · `anonymous`), the
target it touched, the request id that ties it to the structured logs, the duration, the
client's **real IP address and user agent** — unlike view tracking, which only ever keeps a
salted hash, because a hash cannot tell you where a refused sign-in came from — and a redacted
`metadata` object. There is no username: Snapshot is single-admin, so
*how* a request arrived is the part that distinguishes two events.

`metadata` carries what actually changed — the new locale on a preference update, the
destination and short URL on a link, filename, type, size and dimensions on an upload, the
changed keys and their new values on a settings update. Anything whose key looks like a
credential is stored as `"[redacted]"`.

Filters combine: `?categories=auth,security&severities=warning,error&outcomes=failure`
`&actors=api_key&from=<iso>&to=<iso>&search=<text>&page=1&perPage=50`. `search` matches the
action, target, path, error code and request id. Entries are kept for `auditRetentionDays`
(default 90) and pruned at boot and daily.

## Authentication

Three ways in, depending on the caller:

| Caller | Mechanism |
|---|---|
| **Upload clients** (ShareX, scripts) | API key: `Authorization: Bearer <key>` or `X-API-Key: <key>` |
| **Dashboard** | Session cookie (opaque id in Redis) + `X-CSRF-Token` on mutations |
| **Public** | Nothing — share metadata and raw files |

The session cookie is `__Host-snapshot.sid` in production (`Secure`, `SameSite=Strict`) and
`snapshot.sid` in dev. **Nothing authenticates over plain HTTP in production** — the
`__Host-` prefix requires TLS.

Cookie-authenticated mutations need a CSRF token: `GET /api/auth/csrf`, then echo it in
`X-CSRF-Token`. API-key requests are exempt — a custom header cannot be forged
cross-origin. Keys are compared in constant time. A request that *carries* a key header is
judged by that key alone, so a wrong key answers `401 unauthorized` rather than a confusing
CSRF `403`; a request with neither a key nor a token is the one that gets the `403`.

## Uploads

| Method | Path | Auth | |
|---|---|---|---|
| `POST` | `/api/uploads` | session or key | Multipart (`file`, optional `slug`), streamed to disk |
| `GET` | `/api/uploads` | session or key | Paginated: `?page=1&perPage=50` (max 100) |
| `GET` | `/api/uploads/:id` | — | Public metadata + rendered embed |
| `GET` | `/api/uploads/:id/stats` | session | Per-upload view counts |
| `DELETE` | `/api/uploads/:id` | session or key | Removes file, row and cache |
| `GET` | `/raw/:filename` | — | The file itself |
| `GET` | `/raw/thumbnail/:id` | — | Generated still for a video or GIF |

```bash
curl -F "file=@shot.png" -H "Authorization: Bearer $KEY" https://img.example.com/api/uploads
curl -F "slug=holiday" -F "file=@shot.png" -H "Authorization: Bearer $KEY" https://img.example.com/api/uploads
```

Uploads are rejected unless the extension, the declared content type **and** the detected
magic bytes agree, and the size cap is enforced *while* streaming — a too-large file never
lands on disk. **Snapshot stores media only:** the extension→MIME registry in
`packages/contracts` is the whole permitted set (images and video), the allow-lists under
**Settings → Uploads** can only narrow it, and a text or archive file is refused whatever
the config says.

The optional `slug` field asks for a specific id instead of a generated one. It follows the
same rules as a generated upload id (3–64 of `A-Z a-z 0-9 - _`, no dot) and is checked
against the whole `/:id` namespace, so a slug an upload, a short link or a dashboard route
already holds is refused with `409 slug_unavailable`. The dashboard gallery uploads through
this endpoint with the session cookie and a `X-CSRF-Token`; ShareX and any other client keep
using the API key, which is exempt from CSRF.

`GET /api/uploads/:id` returns the share-page payload: ids, sizes, `width`/`height` (null
for containers we do not probe), the checksum, the URLs, and an `embed` object the API has
already rendered from your templates — so a public page never touches the private config.

`/raw/:filename` serves with an immutable cache, a checksum `ETag` (→ `304`) and full
**range support** (`206` + `Content-Range`, `416` past the end): that is what lets a video
player seek and Discord stream a preview. `?download=1` forces a download disposition.
A ranged continuation is not counted as a view, so one playback is one view.

Every video and animated GIF also gets a still frame extracted on upload — a WebP at most
640px wide, served from `/raw/thumbnail/:id` with the same immutable caching. Uploads carry
it as `thumbnailUrl` (null when there is none), the dashboard gallery renders it instead of
pulling the original, and a shared video hands it to Discord as the poster image. It needs
`ffmpeg` on `PATH`; the published image ships it, and without it uploads still succeed —
they simply have no thumbnail. Thumbnails are not counted as views.

## Short links

The shortener shares the `/:id` namespace with uploads, so one lookup resolves either.

| Method | Path | Auth | |
|---|---|---|---|
| `POST` | `/api/links` | session or key | `{ url, slug? }` — mints a slug when you omit one |
| `GET` | `/api/links` | session or key | Paginated: `?page=1&perPage=50` (max 100) |
| `GET` | `/api/links/:slug` | session or key | One link, with its visit count |
| `PATCH` | `/api/links/:slug` | session or key | `{ url }` — repoints an existing slug |
| `DELETE` | `/api/links/:slug` | session or key | Removes the link and its visit log |
| `GET` | `/api/resolve/:id` | — | Resolves an id to an upload **or** a link |
| `GET` | `/api/ids/:id` | session or key | `{ available, occupiedBy }` — is this slug free? |

```bash
curl -X POST https://img.example.com/api/links   -H "Authorization: Bearer $KEY"   -H "Content-Type: application/json"   -d '{"url":"https://example.com/a/very/long/link","slug":"launch"}'
```

`url` must be a full `http://` or `https://` URL — anything else (`javascript:`, `data:`,
a bare hostname) is rejected. `slug` is optional: leave it out and the API generates one
from the shape configured under **Settings → Shortener**. Because uploads and links live in
the same `/:id` namespace, a slug that a link, an upload or a dashboard route already holds
is refused with `409 slug_unavailable` — and a generated id can never collide with either.

`GET /api/resolve/:id` is what the share page calls. It answers a discriminated union —
`{ kind: "upload", upload }` or `{ kind: "link", link }` — tracks the page view or the link
visit, and `404 not_found`s an id nothing is shared under. Uploads win the namespace, which
is why a colliding slug is rejected at creation rather than silently shadowed. The dashboard
turns the link branch into a short interstitial that names the destination before forwarding.

`GET /api/ids/:id` answers whether an id is free and, if not, what holds it (`reserved`,
`upload` or `link`). It needs a session or a key on purpose — unauthenticated it would be an
oracle for enumerating which uploads exist. The dashboard calls it while you type a custom slug.

Listing takes `?sort=` (`slug`, `targetUrl`, `visits`, `createdAt`), `?order=` (`asc`/`desc`)
and `?search=`, which matches the slug or the destination. Sorting and filtering happen in
Postgres, so they cover every page rather than only the rows already loaded.

Visits are counted the same privacy-preserving way as upload views: a salted, daily-rotated
IP hash, never an address.

## Auth

| Method | Path | Auth | |
|---|---|---|---|
| `GET` | `/api/auth/state` | — | `{ initialized, authenticated }` — drives the setup gate |
| `GET` | `/api/auth/csrf` | — | Issues the per-session CSRF token |
| `POST` | `/api/auth/setup` | first run only | Creates the single admin; throttled |
| `POST` | `/api/auth/sign-in` | — | Throttled; deliberately generic errors |
| `POST` | `/api/auth/sign-in/mfa` | pending challenge | Second factor; throttled |
| `POST` | `/api/auth/sign-out` | session | |
| `GET` | `/api/auth/session` | session | `{ username, csrfToken }` |
| `POST` | `/api/auth/change-password` | session | Signs out every other session |
| `GET` | `/api/auth/sessions` | session | ip / user-agent / created / last seen / current |
| `POST` | `/api/auth/sessions/revoke` | session | `{}` revokes others, `{ sessionId }` one |

Setup is rejected once an admin exists. Sign-in never says *which* field was wrong and runs
a dummy hash when the user does not exist, so timing gives nothing away either.

### Two-factor authentication

`POST /api/auth/sign-in` returns a **discriminated union**. Without a second factor it is the
session payload plus `mfaRequired: false`. With one it is `{ mfaRequired: true, csrfToken }`
and **no session is established**: the session id is regenerated and holds only a pending
challenge, so `/api/auth/state` still reports `authenticated: false` and every guarded route
still answers `401`. Post the code to `/api/auth/sign-in/mfa` within five minutes to finish.
That endpoint takes either the 6-digit TOTP code or one recovery code in the same `code`
field, and is throttled per IP like sign-in. Use the `csrfToken` from the challenge for it —
regenerating the session invalidated the previous one.

| Method | Path | Auth | |
|---|---|---|---|
| `GET` | `/api/auth/mfa` | session | `{ enabled, pendingEnrollment, label, enabledAt, recoveryCodesRemaining }` |
| `POST` | `/api/auth/mfa/setup` | session + password | Mints a secret, returns it with an `otpauth://` URI |
| `DELETE` | `/api/auth/mfa/setup` | session | Discards an unconfirmed secret |
| `POST` | `/api/auth/mfa/enable` | session + code | Confirms the secret under a `label`, returns the recovery codes **once** |
| `POST` | `/api/auth/mfa/disable` | session + password + code | Requires a TOTP or unused recovery code; clears the secret and every recovery code |
| `POST` | `/api/auth/mfa/recovery-codes` | session + password + code | Replaces the whole set |

The secret is returned **only** by `setup` — nothing reads it back afterwards. Enrolment is
two-step on purpose: `setup` stores an unconfirmed secret, and only a valid code from the app
turns it on, so a mis-scanned QR code cannot lock you out. A TOTP code is accepted once: the
timestep it belongs to is claimed in Redis, so an intercepted code cannot be replayed inside
its window.

## Config, key, ShareX, stats

| Method | Path | Auth | |
|---|---|---|---|
| `GET` | `/api/config` | session | Runtime config, **API key masked** |
| `PATCH` | `/api/config` | session | Strict partial; unknown fields rejected; applies live |
| `GET` | `/api/api-key` | session | The real key |
| `POST` | `/api/api-key/rotate` | session | Old key dies immediately |
| `GET` | `/api/sharex` | session | The `.sxcu` file |
| `GET` | `/api/stats/overview` | session | Uploads, storage, views, links, sessions, version |
| `GET` | `/api/meta` | — | Name, author, repository, version |
| `GET` | `/api/healthz` | — | `{ "status": "ok" }`, raw |

`PATCH /api/config` never accepts `apiKey` — rotation is its own endpoint. See
[configuration.md](configuration.md) for the fields.

## Rate limiting

`sign-in` (10/min) and `setup` (5/min) are throttled per IP, backed by Redis. A `429`
carries `Retry-After`; the dashboard turns it into a countdown.

`POST /api/uploads` is limited separately by the dashboard-configurable rate limit
(**Settings → Uploads**), also Redis-backed and also answering `429` with `Retry-After`.

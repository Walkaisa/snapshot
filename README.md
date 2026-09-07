<div align="center">
    <br />
    <p>
        <a href="https://walkaisa.dev">
            <img src="https://raw.githubusercontent.com/Walkaisa/snapshot/main/apps/web/public/logo.png" width="200" alt="Snapshot" />
        </a>
    </p>
    <br />
    <p>
        <a href="https://github.com/Walkaisa/snapshot/actions/workflows/node-ci.yml">
            <img src="https://github.com/Walkaisa/snapshot/actions/workflows/node-ci.yml/badge.svg?maxAge=3600" alt="CI">
        </a>
        <a href="https://github.com/Walkaisa/snapshot/pkgs/container/snapshot">
            <img src="https://img.shields.io/badge/ghcr.io-snapshot%20%C2%B7%20amd64%20%7C%20arm64-2496ed?logo=docker&logoColor=ffffff" alt="Container image">
        </a>
        <a href="https://github.com/Walkaisa/snapshot/releases/latest">
            <img src="https://img.shields.io/github/v/release/Walkaisa/snapshot?logo=github&logoColor=ffffff" alt="Latest Release">
        </a>
        <a href="https://github.com/Walkaisa/snapshot/commits/main">
            <img src="https://img.shields.io/github/last-commit/Walkaisa/snapshot.svg?logo=github&logoColor=ffffff" alt="Latest Commit">
        </a>
        <a href="https://walkaisa.dev/discord">
            <img src="https://img.shields.io/discord/996889527698341978?label=discord&logoColor=ffffff" alt="Discord">
        </a>
    </p>
</div>

# Snapshot

Self-hosted media uploads with a dashboard — a [ShareX](https://getsharex.com) target you
run yourself. Take a screenshot, get a link that unfurls properly in Discord.

- **ShareX-native.** Download a ready-made `.sxcu`, import it, done. Uploads stream
  straight to disk and are validated by extension, declared MIME **and** magic bytes.
- **Link previews that actually work.** Share pages are server-rendered with the full Open
  Graph set — including the `og:video` dimensions Discord needs before it will render a
  player. Provider, colour and title/description templates are configurable, with a live
  Discord-style preview while you edit them.
- **A link shortener too.** Shorten any URL to the same origin, with a custom slug when you
  want one. It is part of the API, so any service holding your key can create links — and
  short links share the id namespace with uploads, so nothing can ever shadow anything.
- **Video and GIF thumbnails, made for you.** Every video and animated GIF gets a still
  frame extracted on upload, so the gallery is a grid of pictures instead of a grid of
  half-loaded videos — and a shared clip unfurls with a poster image. Existing libraries are
  filled in on the next start.
- **IDs you decide.** Uploads and short links each get their own generator: pick the
  character sets it draws from or type the exact alphabet, demand a minimum number of digits
  and symbols, and watch the number of possible ids move as you drag the length.
- **A real dashboard.** Upload limits, allowed types, rate limiting, embed templates, API
  key rotation, active sessions. Light and dark, English and German.
- **Two-factor authentication.** Optional TOTP from any authenticator app, with single-use
  recovery codes and the secret encrypted at rest.
- **Yours alone.** One container, one Postgres, one Redis — configured entirely through
  environment variables. No third-party services, no telemetry. Visitor IPs are stored only
  as salted, daily-rotated hashes.
- **Runs on a Pi.** The image is published for `linux/amd64` **and** `linux/arm64` under the
  same tag, so `docker pull` gets the right one either way.

## Quickstart

```bash
cp .env.example .env      # fill in BASE_URL, SESSION_SECRET, MFA_ENCRYPTION_KEY, POSTGRES_PASSWORD
docker compose up -d
```

Those four values are the entire required configuration — everything else in `.env.example`
is commented out and already has a working default.

Snapshot expects **your** nginx to terminate TLS and serve it under a single origin — a
copy-paste vhost is in [docs/deployment.md](docs/deployment.md). Then open the site, create
the admin account, and grab your `.sxcu` from the **ShareX** tab.

## Documentation

| | |
|---|---|
| [Deployment](docs/deployment.md) | compose, the nginx vhost, updating, backups |
| [Configuration](docs/configuration.md) | every environment variable and dashboard setting |
| [API](docs/api.md) | the REST surface, auth model, error envelope |
| [Development](docs/development.md) | running it locally, testing, project layout |

## Stack

Next.js 16 (App Router) · NestJS 11 · PostgreSQL 17 · Redis 7 · Drizzle · Zod ·
TanStack Query · Tailwind v4 with shadcn/ui on Base UI · pnpm workspaces + Turborepo.

Conventions live in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © [Walkaisa](https://walkaisa.dev)

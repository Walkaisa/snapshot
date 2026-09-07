# Security Policy

## Supported versions

Security fixes are provided for the latest released version only. Snapshot ships as a
single container image, `ghcr.io/walkaisa/snapshot` (`linux/amd64` + `linux/arm64` under
one tag); update by pulling the newest tag.

## Reporting a vulnerability

Please do **not** open a public issue with exploit details.

Use GitHub's private reporting instead:
[**Report a vulnerability**](https://github.com/Walkaisa/snapshot/security/advisories/new).
Include a clear description, the affected version or commit, and reproduction steps
where possible.

What to expect:

- Acknowledgement as soon as practical.
- Reproduction and impact assessment before any public disclosure.
- A fix, a release, and release notes.
- Credit for the reporter, if they want it.

## Deployment recommendations

Snapshot is self-hosted, so its security depends on how you run it:

- **Serve it over HTTPS.** Production session cookies carry the `__Host-` prefix and
  are `Secure`; nothing authenticates over plain HTTP. Terminate TLS in your own
  nginx — see [docs/deployment.md](docs/deployment.md).
- **Set independent strong `SESSION_SECRET` and `MFA_ENCRYPTION_KEY` values** (>= 32
  random characters each) and a strong `POSTGRES_PASSWORD`. The placeholders in
  `.env.example` are rejected in production.
- **Keep `WEB_BIND` / `API_BIND` on `127.0.0.1`.** Your reverse proxy is the only
  thing that should face the internet.
- **Set `BASE_URL` to the real public origin.** Every share, raw and delete URL is
  built from it.
- **Turn on two-factor authentication** (**Account → Security**) and store the recovery
  codes somewhere other than the machine you sign in from. They are shown once.
- **Rotate the upload API key** from the dashboard (**Integrations → API key**) after any
  suspected exposure — the old key stops working immediately.
- **Keep `MFA_ENCRYPTION_KEY` stable.** Changing it makes the encrypted authenticator secret
  unreadable. Recovery codes remain usable because they are hashed independently; after
  signing in with one, turn two-factor off and enrol again. `SESSION_SECRET` can be rotated
  independently and invalidates existing browser sessions.
- **Keep uploads, `.env` and logs out of version control.** The repository's
  `.gitignore` already covers them.

## Scope

Reports involving authentication or CSRF bypass, session fixation, path traversal,
unsafe file handling, stored-file exposure, SSRF, container privilege issues, or
vulnerable dependencies are especially valuable.

# Deployment

Snapshot expects **you** to run the TLS edge. Compose publishes the dashboard on `:3000`
and the API on `:3001` (loopback by default); your nginx puts both behind one public
origin. A single origin is what makes the session cookie same-site and keeps CORS out of
the picture entirely — do not split web and api across hostnames.

There is **one image**: `ghcr.io/walkaisa/snapshot` carries the API and the dashboard in a
single container, and everything about a deployment is an environment variable. It is
published for **`linux/amd64` and `linux/arm64`** under the same tag, so a Raspberry Pi and
an x86 server both run `docker pull ghcr.io/walkaisa/snapshot:latest` and get their own
architecture — no `--platform` flag, no separate tag.

Check what a tag holds with:

```bash
docker buildx imagetools inspect ghcr.io/walkaisa/snapshot:latest
```

## 1. Configure

```bash
cp .env.example .env
# Fill in: BASE_URL, SESSION_SECRET, MFA_ENCRYPTION_KEY, POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(36).toString('base64'))"   # generate each secret independently
```

Those four are the whole required set; everything else in the file is commented out and
already has the value shown. `.env` is read by `docker compose` and by nothing else — see
[Configuration](configuration.md#which-file).

`BASE_URL` must be the **public** origin (`https://img.example.com`). Every share link,
raw URL and ShareX delete URL is built from it.

Compose publishes both ports on `127.0.0.1`. Set `BIND_ADDRESS` only if your proxy runs on
another host, and firewall the ports if you do.

## 2. Run

```bash
docker compose up -d          # pulls postgres, redis and snapshot
docker compose ps             # all services healthy
docker compose logs -f snapshot
```

Startup is health-gated on postgres + redis; the API then runs migrations and reconciles
the uploads directory before serving.

Both processes inside the container are supervised by `docker/supervisor.mjs`: if
either the API or the dashboard exits, the container exits too and the restart policy
brings the whole thing back. There is deliberately no partial restart — a container
serving only half of Snapshot would pass a naive check while being useless.

To build locally instead of pulling: `docker compose up -d --build`.

## 3. nginx vhost

Copy-paste, then adjust `server_name` and the certificate paths:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name img.example.com;

    ssl_certificate     /etc/letsencrypt/live/img.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/img.example.com/privkey.pem;

    # Must be >= the dashboard's "max file size" (default 50 MB), or nginx rejects
    # the upload with a 413 before it ever reaches the API.
    client_max_body_size 50m;

    # The API streams uploads straight to disk; do not let nginx spool them first.
    proxy_request_buffering off;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # API + raw files go straight to the API — no Node double-hop for large media.
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
    }

    location /raw/ {
        proxy_pass http://127.0.0.1:3001;
        # Range requests must pass through untouched: they are what lets a video
        # player seek and what Discord uses to stream a preview.
        proxy_buffering off;
    }

    # Everything else is the dashboard + share pages.
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name img.example.com;
    return 301 https://$host$request_uri;
}
```

`X-Forwarded-For` / `-Proto` are not optional: the API runs behind `trust proxy`, so they
are what make `secure` cookie detection and per-session IP tracking see the real client
instead of the proxy.

## 4. First run

Open `https://img.example.com` → the setup gate creates the single admin account. Then
**Integrations → Keys** → copy, or **Integrations → ShareX** → download the `.sxcu` and import it into ShareX.

## 5. Updating

```bash
docker compose pull && docker compose up -d
```

Migrations run automatically on API start. `latest` always points at the newest GitHub
Release. Pin an exact one with `SNAPSHOT_TAG=1.0.0` in `.env` if you would rather not track
`latest`; `SNAPSHOT_TAG=1.0` follows the patches of that minor series but never a feature
release, and `SNAPSHOT_TAG=sha-<short>` pins one specific build.

## Backups

Three volumes hold everything: `snapshot_uploads` (the files), `snapshot_pg_data`
(metadata, accounts, config) and `snapshot_redis_data` (sessions + caches, expendable).

```bash
docker compose exec -T postgres pg_dump -U snapshot snapshot | gzip > snapshot-db.sql.gz
docker run --rm -v snapshot_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/snapshot-uploads.tar.gz -C /data .
```

Uploads and the database belong together — a restored database referencing missing files
logs them as orphans on the next boot; files without rows are re-imported automatically.

## Discord embeds

Share links unfurl through Open Graph tags rendered server-side. Discord needs to reach
`BASE_URL` publicly, so this only works once the vhost above is live — `localhost` is not
crawlable. Video previews additionally require the file to be under Discord's own embed
size limit (~20 MB at the time of writing); larger videos still play on the share page.

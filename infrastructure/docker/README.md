# Production containers

The files that build and run BONANZA on one Docker host: two images (backend, storefront) and one Compose stack with PostgreSQL, Redis and a Caddy reverse proxy.

Nothing here has been deployed. The stack was built and exercised on a development machine on 2026-11-23; what was and was not checked is listed in [Validation record](#validation-record). The server it is meant for is described in [docs/oracle-deployment.md](../../docs/oracle-deployment.md).

| File | What it is |
|---|---|
| `backend.Dockerfile` | One image for `medusa-server`, `medusa-worker` and the `migrate` job |
| `storefront.Dockerfile` | The Next.js standalone server |
| `compose.prod.yaml` | The stack. On the server it is `/opt/bonanza/compose.yaml` |
| `Caddyfile` | Reverse proxy rules. On the server it is `/opt/bonanza/Caddyfile` |
| `.env.production.example` | Template for `/opt/bonanza/.env`. Placeholders only |
| `../../.dockerignore` | What the builds may read. An allowlist: env files never enter a build |

## Building

The build context is the repository root.

```bash
docker build -f infrastructure/docker/backend.Dockerfile    -t bonanza-backend:local .
docker build -f infrastructure/docker/storefront.Dockerfile -t bonanza-storefront:local .
```

Neither build reads a secret or needs a database or a running backend. Two settings are fixed in the image when it is built, because the frameworks compile them in. Everything else is read when a container starts.

| Image | Build argument | What it fixes | If left out |
|---|---|---|---|
| storefront | `IMAGE_HOSTNAMES` (comma-separated) | The hosts product and content images may be loaded from: the hostname of `S3_FILE_URL`. Next.js copies `next.config.ts` into the standalone server during the build. | Only `localhost` is allowed, and images from the media bucket are refused. Setting the variable on the running container changes nothing. |
| backend | `STOREFRONT_URL` | The storefront address inside the admin dashboard's "copy payment link" action. Medusa compiles it into the dashboard. | That one link points at `http://localhost:8000`. Nothing else is affected: emails and previews read `STOREFRONT_URL` at run time. |

```bash
docker build -f infrastructure/docker/storefront.Dockerfile \
  --build-arg IMAGE_HOSTNAMES=media.example.com -t bonanza-storefront:local .
docker build -f infrastructure/docker/backend.Dockerfile \
  --build-arg STOREFRONT_URL=https://shop.example.com -t bonanza-backend:local .
```

So an image built before the media hostname is known has to be rebuilt once it is.

Listing the hostname is necessary but not enough. The storefront downloads each picture itself, from inside its container, before resizing it. The hostname therefore has to resolve from the server to a public address: a production build refuses an address on a private network, and a name that only exists on someone's own machine cannot be found at all. With R2 (or with pictures served by the public API hostname through Cloudflare) both conditions hold. Do not build a real image with `IMAGES_ALLOW_LOCAL=true`; the Dockerfile deliberately has no argument for it.

Sizes measured on arm64: backend 1.12 GB on disk (164 MB compressed), storefront 303 MB (74 MB compressed). Most of the backend is Medusa's production dependencies, which include the admin dashboard's build tooling.

The backend image carries the pictures in `apps/backend/src/scripts/seed-assets/site`, which the starter-content seed uploads. It does not carry the demo catalog's product images, so demo data cannot be loaded from it.

## The stack

| Service | Image | Memory limit | Networks | Published ports |
|---|---|---|---|---|
| `postgres` | PostgreSQL 17.12 | 2 GB | data | none |
| `redis` | Redis 7.4, append-only file, no eviction | 384 MB | data | none |
| `medusa-server` | backend | 1.5 GB | web, data | none |
| `medusa-worker` | backend | 1 GB | web, data | none |
| `storefront` | storefront | 768 MB | web | none |
| `caddy` (profile `tunnel`) | Caddy 2.11 | 128 MB | web | none |
| `cloudflared` (profile `tunnel`) | cloudflared 2026.11 | 128 MB | web | none |
| `caddy-direct` (profile `direct`) | Caddy 2.11 | 128 MB | web | 80, 443 |
| `migrate` (profile `tools`) | backend | 1 GB | web, data | none |

- The `data` network has no route to the internet. PostgreSQL and Redis are reachable only from the backend containers. Redis has no password; that network is its protection.
- No container mounts the Docker socket. The application containers run as the user `node` with all capabilities dropped.
- PostgreSQL, Redis, Caddy and cloudflared are pinned by digest. A deployment therefore never changes them; to update one, change its tag and digest in `compose.prod.yaml` on purpose.
- Container logs are kept as 5 files of 10 MB per container.
- Named volumes: `postgres-data` (backed up by `ops/backup.sh`), `redis-data`, `caddy-data`, `caddy-config`, and `medusa-uploads`. The last one holds uploaded files only while no S3 bucket is configured, and is not backed up.

### Ingress profiles

`COMPOSE_PROFILES` in `.env` chooses how web traffic gets in.

| | `tunnel` | `direct` |
|---|---|---|
| Containers | `cloudflared` and `caddy` | `caddy-direct` |
| Published ports | None | 80 and 443 |
| TLS | Ends at Cloudflare. cloudflared hands requests to `http://caddy:80`. | Caddy obtains a public certificate for each hostname and redirects port 80 to 443. |
| Meant for | Production | Testing before the domain is on Cloudflare |

The proxy in direct mode is a service of its own, `caddy-direct`, because Compose cannot publish a port for one profile only. Both use the same `Caddyfile`. When switching modes, remove the other mode's containers by name, since Compose leaves them running:

```bash
# after setting COMPOSE_PROFILES=direct
docker compose --env-file .env --env-file images.env up -d --remove-orphans
docker compose --env-file .env --env-file images.env --profile tunnel rm --stop --force cloudflared caddy

# after setting COMPOSE_PROFILES=tunnel
docker compose --env-file .env --env-file images.env up -d --remove-orphans
docker compose --env-file .env --env-file images.env --profile direct rm --stop --force caddy-direct
```

In direct mode nothing stands in front of the dashboard hostname except Medusa's own sign-in.

### What each hostname serves

| Hostname | Goes to | Rules |
|---|---|---|
| `STOREFRONT_HOST` | `storefront` | `/api/revalidate` answers 404 from outside; the backend calls it over the private network. Request bodies up to 2 MB. |
| `API_HOST` | `medusa-server` | An allowlist. Passed on: `/health`, `/store/*`, `/auth/customer/*`, `/auth/session`, `/auth/token/refresh`, `/hooks/*`, `/static/*`, `/dev-gateway/pay/*`. Everything else answers 404, including `/admin*`, `/app*` and `/auth/user/*`. Bodies up to 2 MB. |
| `DASHBOARD_HOST` | `medusa-server` | `/` redirects to `/app`. `/store*`, `/hooks*` and `/dev-gateway*` answer 404. Bodies up to 10 MB, and up to 100 MB on `/admin/uploads` (the backend accepts 12 files of 8 MB and checks each file itself). |
| `STOREFRONT_WWW_HOST` (optional) | redirect | Plain HTTP only; redirects to `https://STOREFRONT_HOST`. |
| anything else | nothing | 404 |

A new public backend route has to be added to the allowlist in the `Caddyfile`, or it will answer 404 on the API hostname.

Caddy works out the visitor's address (from `CF-Connecting-IP` when the request arrives from cloudflared, from the connection otherwise) and passes that single address on in `X-Forwarded-For`, `X-Real-IP` and `CF-Connecting-IP`. This is why `TRUST_CLOUDFLARE_IP` defaults to `true` in the Compose file. It stops being safe if `medusa-server` is ever exposed without Caddy in front.

After changing the `Caddyfile` on the server, restart the proxy (`docker compose ... restart caddy`, or `caddy-direct` in direct mode). The file is mounted on its own, and a file replaced by `scp` is not seen by a running container.

## Settings

Copy `.env.production.example` to `.env` beside the Compose file, mode 600, and fill it in. Compose refuses to run while a required value is missing and names it. Three points are easy to get wrong:

- **`DATABASE_URL` is built by the Compose file and ends in `?sslmode=disable`.** Keep it. With any database host other than `localhost`, Medusa 2.23's migration step otherwise insists on TLS, and `medusa db:migrate` fails after ten seconds with "Could not connect to the database while running migrations". Medusa's own spelling, `ssl_mode=disable`, does not prevent this. The connection stays on the private `data` network of one machine.
- **`POSTGRES_PASSWORD` must be letters and digits only**, because it is placed inside that URL. It is applied when the database volume is first created; changing it in `.env` later does not change the database.
- **The public addresses follow from the three hostnames** as `https://<host>`. Set `STOREFRONT_URL`, `MEDUSA_BACKEND_URL` and the three `*_CORS` values only when browsers use something else, such as a non-standard port.

`images.env` holds `BACKEND_IMAGE` and `STOREFRONT_IMAGE`. On the server `ops/deploy.sh` writes it.

## First start

The storefront needs a publishable API key, and the key is created by the first migration run. So the first start takes two passes.

1. Run the migrations and start everything. On the server this is `ops/deploy.sh <backend-ref> <storefront-ref>`. By hand:

   ```bash
   docker compose --env-file .env --env-file images.env run --rm migrate
   docker compose --env-file .env --env-file images.env up -d --wait
   ```

   The stack reports healthy at this point even though the storefront has no key yet: its health check only asks whether the server answers.

2. Read the key, put it in `.env` as `MEDUSA_PUBLISHABLE_KEY`, and recreate the storefront:

   ```bash
   docker compose --env-file .env --env-file images.env exec -T postgres \
     psql -U bonanza -d bonanza -tAc \
     "select token from api_key where type = 'publishable' and revoked_at is null and deleted_at is null order by created_at limit 1"

   docker compose --env-file .env --env-file images.env up -d storefront
   ```

   The key is not a secret. It is also shown in the dashboard under Settings → Publishable API Keys.

3. Create the first admin user. The password ends up in the shell history, so change it after the first sign-in:

   ```bash
   docker compose --env-file .env --env-file images.env exec medusa-server \
     medusa user -e you@example.com -p '<password>'
   ```

4. Optionally create the starter structure (categories, home page sections, menus, draft pages). Run it in `medusa-server`, which has the uploads volume mounted:

   ```bash
   docker compose --env-file .env --env-file images.env exec medusa-server \
     medusa exec ./src/scripts/seed-content.js
   ```

Later deployments are one command, `ops/deploy.sh`, which runs `migrate` before starting the new version.

## Trying the stack on a development machine

This uses the `direct` profile with certificates from Caddy's own authority, on loopback ports that do not collide with the development stack. It needs nothing from Cloudflare.

1. Build both images (see above) and create a working directory holding copies of `compose.prod.yaml` (as `compose.yaml`), `Caddyfile`, a filled-in `.env`, and an `images.env` naming the two local tags.
2. In that `.env`, besides the secrets:

   ```
   COMPOSE_PROFILES=direct
   CADDY_TLS=internal
   DIRECT_HTTP_BIND=127.0.0.1:18081
   DIRECT_HTTPS_BIND=127.0.0.1:18443
   STOREFRONT_HOST=shop.bonanza.test
   API_HOST=api.bonanza.test
   DASHBOARD_HOST=dashboard.bonanza.test
   STOREFRONT_URL=https://shop.bonanza.test:18443
   MEDUSA_BACKEND_URL=https://api.bonanza.test:18443
   STORE_CORS=https://shop.bonanza.test:18443
   ADMIN_CORS=https://dashboard.bonanza.test:18443
   AUTH_CORS=https://shop.bonanza.test:18443,https://dashboard.bonanza.test:18443
   ```

3. Use a project name of its own for every command, so nothing is confused with a stack called `bonanza`, then follow [First start](#first-start):

   ```bash
   docker compose -p bonanza-trial --env-file .env --env-file images.env run --rm migrate
   docker compose -p bonanza-trial --env-file .env --env-file images.env up -d --wait
   ```

4. Ask for pages with the hostname pinned to loopback and Caddy's root certificate:

   ```bash
   docker compose -p bonanza-trial --env-file .env --env-file images.env \
     exec -T caddy-direct cat /data/caddy/pki/authorities/local/root.crt > caddy-root.crt

   curl --cacert caddy-root.crt --resolve shop.bonanza.test:18443:127.0.0.1 \
     https://shop.bonanza.test:18443/
   ```

5. Remove it, volumes included:

   ```bash
   docker compose -p bonanza-trial --env-file .env --env-file images.env down --volumes
   ```

Three things to expect in a trial:

- Signing in to the dashboard needs HTTPS, because Medusa marks its session cookie `Secure` in a production build. That is why the trial uses the direct profile rather than plain HTTP.
- For a browser, the three names have to point at `127.0.0.1`. This was checked with `curl --resolve` and with a headless Chromium started with the same mapping (`--host-resolver-rules`), not by editing `/etc/hosts`.
- Uploaded pictures do not show on the storefront. Their addresses are on the API hostname, and the storefront's image optimizer has to download them from inside its container, where a made-up name such as `api.bonanza.test` does not resolve (the optimizer answers 500). Pointing it at the backend's address inside Docker does not help either: a production build refuses private addresses. The pictures themselves are served correctly by the API hostname; only the resized copies are missing. A real deployment does not have this problem (see [Building](#building)).

## Validation record

Checked on 2026-11-23 on an arm64 Mac with Docker Desktop, with both images built for linux/arm64 from commit 862eb34 and run as described in [Trying the stack on a development machine](#trying-the-stack-on-a-development-machine). The first table is what was observed on that commit. A shorter re-check on a later commit follows it. The last table is what was observed earlier the same day on commit 484ca61 and not repeated; the `Caddyfile` has not changed since.

**Observed on commit 862eb34**

| Area | Result |
|---|---|
| Builds | Backend in 186 seconds and storefront in 90 seconds, from an empty build cache. Both build arguments end up in the images: the admin bundle contains the given `STOREFRONT_URL` and no `localhost:8000`, and the storefront's server lists exactly the given `IMAGE_HOSTNAMES`. |
| Seed pictures | `/app/src/scripts/seed-assets/site` in the backend image holds the 13 pictures and nothing else. |
| `migrate` | Exit 0. |
| Start | All services healthy 15 seconds after `up -d --wait`, before the publishable key was set. |
| First start | The steps in [First start](#first-start), in that order: key read from the database, `up -d storefront`, admin user created. |
| Starter content | `medusa exec ./src/scripts/seed-content.js` in `medusa-server`: exit 0, no picture skipped, both photographs in the uploads volume. `/store/cms/homepage` on the API hostname returns 8 sections; the hero and About sections carry picture addresses, and the picture is served (200, `image/jpeg`). |
| Storefront pages | 200 for `/`, `/en`, `/ar`, `/gallery`, `/products`, `/products?sort=price-asc`, `/brands`, `/cart`, `/account/login`; 404 for `/nope/deep`. `/` and `/en` are cacheable (`s-maxage=300`); `/cart`, `/en/cart` and `/account/login` are `private, no-store`. `lang` and `dir` are `he`/`rtl`, `en`/`ltr`, `ar`/`rtl`. The Hebrew and English hero titles are in the HTML. The catalog was empty: no product page, no cart with items and no checkout was exercised. |
| Image optimizer | With a public host allowed at build time it converts a 45 KB JPEG to AVIF (9 KB) and WebP (15 KB). A host that resolves to a private address is refused (400) even when allowed, and a host that was not allowed is refused (400). |
| Hostname rules | Over HTTPS. API host: `/health` and `/store/regions` 200; `/admin`, `/admin/users`, `/app`, `/app/login`, `/auth/user/emailpass`, `/rbac/roles`, `/` 404. Dashboard host: `/` redirects to `/app`; `/app` 200; `/admin/users` 401; `/store`, `/store/regions`, `/hooks/…` 404. Storefront host: `/api/revalidate` 404. Unknown hostname 404; port 80 redirects to HTTPS. |
| Published ports | Only the proxy. No container mounts the Docker socket. |
| Persistence | Database rows, a Redis key and the uploaded files survive `down` followed by `up`. |
| Production guard | With `APP_ENV=production` and `PAYMENT_DEV_ENABLED=true` the server, the worker and `migrate` each exit 1 with the refusal message. |
| Sign-in limits per visitor | Failed sign-ins submitted through the storefront's real form, by a headless browser, as two visitors (`CF-Connecting-IP` set to two addresses, accepted because the browser reaches the proxy from a private address, as cloudflared does). The backend's counters are kept per visitor address, not under the storefront's own. The first visitor is refused from the 21st attempt in five minutes; the second is not affected. A visitor header without a valid signature is ignored. |
| Page refresh | From `medusa-worker`, `POST http://storefront:8000/api/revalidate` answers 200 with the shared secret and 401 with a wrong one. |
| Admin session | Direct mode: sign-in works after a restart. Tunnel-mode proxy (plain HTTP inside): the `Secure` session cookie is set when the peer sends `X-Forwarded-Proto: https`, and not set without it. |
| Ops scripts | `deploy.sh` and `rollback.sh` (exit 0, `images.env` and `images.env.previous` swapped as documented). `backup.sh`, `restore-verify.sh` and `healthwatch.sh`, run in a Linux container with restic 0.16.4 (the version Ubuntu 24.04 ships) against a local S3-compatible server: repository created, database and configuration snapshots saved, retention and check passed; the dump restored into a throwaway PostgreSQL 17.12 with 166 tables and 195 migration rows; healthwatch then reports no open problem. |
| Memory | About 500 MB in total a few minutes after a restart: medusa-server 182 MB, medusa-worker 153 MB, storefront 57 MB, postgres 57 MB, caddy 35 MB, redis 6 MB. An earlier sample was 610 MB. |

**Re-checked on commit e380328**

That commit adds a Redis-backed cache module to the backend and upgrades nodemailer; the storefront is unchanged from 862eb34. Both images build (backend 110 seconds, storefront 51 seconds). `migrate`, the start, the first-start steps, the starter-content seed with its two photographs, and admin sign-in with a session all work, and the backend logged no error or warning. Nothing else in the first table was repeated on this commit.

**Observed on commit 484ca61 and not repeated**

| Area | Result |
|---|---|
| `caddy validate` | Valid for tunnel and direct mode, public and internal certificates. |
| Headers | Each security header appears once per response; `Server` and `Via` are removed. |
| Body limits | 413 above 2 MB (API, storefront), 10 MB (dashboard) and 100 MB (uploads). A 12 MB upload reaches the backend, which refuses it with its own 8 MB message. |
| Tunnel-mode routing | The hostname rules above, over plain HTTP with the proxy's port published by a test override. |
| Direct mode | Certificate from Caddy's own authority verifies; HTTP/2; no HTTP/3 advertised. |
| `deploy.sh` failure | With a storefront image that cannot become healthy it exits 10 and restores the previous version. |
| Staging | With `APP_ENV=staging` and the simulated payment provider switched on, the server starts. |

**Not checked**

- `cloudflared` has never run: there is no tunnel to connect to. Whether Cloudflare and cloudflared send `X-Forwarded-Proto: https` was therefore not observed, only what the proxy and the backend do when it is sent.
- A public certificate in direct mode, and a visitor from a public address sending a forged `CF-Connecting-IP`.
- A linux/amd64 build.
- Product pages, a cart with items and checkout in a production build.
- Uploaded pictures on the storefront with a real media hostname. In the local trial they do not show, for the reason given above.
- `ops/restore.sh` (replacing the live database), and the backup scripts against Cloudflare R2 or run directly on a host.
- Behaviour after a host reboot, under memory pressure, and over days of running.

**Seen during validation, outside these files**

- Medusa's own request log includes query strings; Caddy's log cuts them off.
- The MinIO images named in the development `compose.yaml` (`minio/minio`, `minio/mc`) could not be pulled from Docker Hub on 2026-11-23: the registry answers that the repositories do not exist.

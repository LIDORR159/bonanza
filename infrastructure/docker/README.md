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

Sizes measured on arm64: backend 1.12 GB on disk (163 MB compressed), storefront 301 MB (73 MB compressed). Most of the backend is Medusa's production dependencies, which include the admin dashboard's build tooling.

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

Two things to expect in a trial. Signing in to the dashboard needs HTTPS, because Medusa marks its session cookie `Secure` in a production build; that is why the trial uses the direct profile rather than plain HTTP. And for a browser, the three names have to point at `127.0.0.1` in `/etc/hosts` (this was checked with `curl --resolve` only).

## Validation record

Checked on 2026-11-23 on an arm64 Mac with Docker Desktop, from commit 484ca61 plus the four-file `revalidate` fix that is now in the tree. Images built for linux/arm64.

**Observed working**

| Area | Result |
|---|---|
| Builds | Both images build with no environment and no backend reachable. |
| `caddy validate` | Valid for tunnel and direct mode, public and internal certificates. |
| `migrate` | Exit 0, and exit 0 again on a second run. |
| Start | All services healthy about 10 seconds after `up -d --wait`. |
| Admin user | Created with `medusa user`; sign-in works on the dashboard hostname. |
| Hostname rules | API host: `/health` and `/store/regions` 200; `/admin`, `/app`, `/auth/user/emailpass`, `/rbac/roles` 404. Dashboard host: `/` redirects to `/app`, `/app` 200, `/store` and `/hooks` 404. Storefront host: home page 200, `/api/revalidate` 404. Unknown hostname 404. |
| Headers | Each security header appears once per response; `Server` and `Via` are removed. |
| Body limits | 413 above 2 MB (API, storefront), 10 MB (dashboard) and 100 MB (uploads). A 12 MB upload reaches the backend, which refuses it with its own 8 MB message. |
| Visitor address | An address sent in `CF-Connecting-IP` from a private-network peer appears as the client address in both Caddy's and Medusa's logs. |
| Published ports | Only the proxy. PostgreSQL, Redis, both backend containers and the storefront publish nothing. |
| Persistence | Database rows, a Redis key and an uploaded file survive `down` followed by `up`. |
| Production guard | With `APP_ENV=production` and `PAYMENT_DEV_ENABLED=true` the server, the worker and `migrate` all exit 1 with the refusal message. With `APP_ENV=staging` the server starts. |
| Direct mode | With `CADDY_TLS=internal`: certificate verifies, HTTP/2, port 80 redirects to HTTPS, the admin session cookie is `HttpOnly; Secure; SameSite=Lax` and works. |
| Ops scripts | `healthwatch.sh` reports all services healthy. `deploy.sh` succeeds, and with a broken storefront image it exits 10 and restores the previous version. |
| Idle memory | About 610 MB in total: medusa-server 264 MB, medusa-worker 219 MB, storefront 51 MB, postgres 51 MB, caddy 15 MB, redis 11 MB. One sample, shortly after start. |

**Not checked**

- `cloudflared` has never run: there is no tunnel to connect to. Tunnel mode was exercised without it, with the proxy's port published by a test override.
- A public certificate in direct mode, and a visitor from a public address sending a forged `CF-Connecting-IP`.
- Admin sign-in through Cloudflare in tunnel mode. It depends on Cloudflare sending `X-Forwarded-Proto: https`, which Caddy passes on from cloudflared.
- The two build arguments with real values, and a linux/amd64 build.
- `seed-content.js` in the image. The line that copies `seed-assets/site` into the backend image and the matching `.dockerignore` rules were added after the builds above and have not been built.
- `ops/rollback.sh`, `ops/restore.sh`, `ops/backup.sh` and `ops/restore-verify.sh` against this stack.
- Behaviour after a host reboot, under memory pressure, and over days of running.
- Product pictures in a local trial without an S3 bucket.

**Seen during validation, outside these files**

- At commit 484ca61 the storefront's `/products` page answered 500 in a production build (`DYNAMIC_SERVER_USAGE`). The listing pages have since been changed; this needs a production build to confirm.
- The storefront calls the backend from its own server and passes no visitor address on. From reading `apps/backend/src/lib/rate-limit.ts`, the per-address limits on customer sign-in and registration would then count every shopper as one address. This was not observed in a running system.
- Medusa's own request log includes query strings; Caddy's log cuts them off.

# Cloudflare: what would be set up, and when

**Nothing described here exists.** No Cloudflare resource has been created, no login was performed and no command in this file has been run against an account. Every item below is marked **Needs explicit approval — nothing created**, and stays that way until the owner says otherwise.

This file is the list of what the production design expects from Cloudflare, so that it can be reviewed and approved item by item. The design itself is in [docs/architecture.md](../../docs/architecture.md); the server side is in [infrastructure/docker](../docker/README.md).

## Before anything else

| Prerequisite | Why | Status |
|---|---|---|
| A domain, added to a Cloudflare account as a zone | Tunnel hostnames, the media hostname and Access all need a zone. Buying a domain costs money. | **Needs explicit approval — nothing created** |
| A payment method on the Cloudflare account | Cloudflare is expected to ask for one before R2 or Zero Trust can be switched on, even when usage stays free. This was not confirmed for this account. | **Needs explicit approval — nothing created** |

## The list

| # | Item | Done how | Expected cost | Status |
|---|---|---|---|---|
| 1 | R2 bucket for media, public through a custom hostname, with a CORS policy | Dashboard, or `wrangler` | $0 within R2's free allowance | **Needs explicit approval — nothing created** |
| 2 | R2 bucket for backups, private | Dashboard, or `wrangler` | $0 within the same allowance | **Needs explicit approval — nothing created** |
| 3 | Cloudflare Tunnel with three public hostnames | Dashboard (Zero Trust) | $0 | **Needs explicit approval — nothing created** |
| 4 | Access application on the dashboard hostname | Dashboard (Zero Trust) | $0 on the free plan | **Needs explicit approval — nothing created** |
| 5 | One rate-limiting rule | Dashboard (Security → WAF) | $0: the Free plan includes one rule | **Needs explicit approval — nothing created** |

### What can cost money

- **R2 has no spending cap.** The free allowance, as published on 2026-11-23, is 10 GB of Standard storage, 1 million Class A operations and 10 million Class B operations per month, with free egress. Beyond that Cloudflare bills automatically ($0.015 per GB-month, $4.50 and $0.36 per million operations). Both buckets share the one allowance. Set a usage notification on the account when R2 is enabled.
- **Anything outside this list**: Workers Paid, Cloudflare Images, Load Balancing, Argo, a paid zone plan, additional rate-limiting rules. None is needed for this design.
- **The Workers target for the storefront** (`apps/storefront/wrangler.jsonc`) is not part of this list. It would add a Worker, a second R2 bucket and a D1 database, and `docs/architecture.md` puts it at about $5 a month. It has its own workflow, which deploys nothing.

## 1. Media bucket

**Needs explicit approval — nothing created.**

Product and content images. The backend uploads through the S3 API; shoppers load images from the bucket's public hostname.

| Setting | Value |
|---|---|
| Bucket name | To be chosen, for example `bonanza-media` |
| Public access | A custom hostname on the zone (R2 → bucket → Settings → Custom Domains). Leave the `r2.dev` address off. |
| API token | R2 token limited to this bucket, permission Object Read & Write |
| CORS policy | Below |

Uploads do not need CORS today: both the built-in dashboard and the custom content screens send files to the backend (`POST /admin/uploads`), and the backend writes them to the bucket. Plain `<img>` tags do not need it either. The policy below is the minimum that lets a page on the two sites read an image with a script (a preview or a crop tool), and nothing else:

```json
[
  {
    "AllowedOrigins": ["https://shop.example.com", "https://dashboard.example.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "MaxAgeSeconds": 3600
  }
]
```

The backend also has a route that hands out direct-to-bucket upload links (`/admin/uploads/presigned-urls`). No screen uses it. If one ever does, the dashboard's origin additionally needs `"PUT"` in `AllowedMethods` and `"AllowedHeaders": ["content-type"]`.

That is the format the dashboard takes (R2 → bucket → Settings → CORS policy). With `wrangler` the same policy is a file in wrangler's own shape, `{"rules": [{"allowed": {"origins": [...], "methods": [...]}, "maxAgeSeconds": 3600}]}`. The commands, for when this is approved (they create or change resources; **not run**):

```bash
wrangler r2 bucket create bonanza-media
wrangler r2 bucket cors set bonanza-media --file cors.json
```

What the server then needs in `/opt/bonanza/.env`:

| Variable | Value |
|---|---|
| `S3_BUCKET` | The bucket name |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_FILE_URL` | `https://<media hostname>`, no trailing slash |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | The token's key pair |
| `S3_REGION` | `auto` |

The media hostname also has to be given to the storefront image **when it is built** (`--build-arg IMAGE_HOSTNAMES=<media hostname>`); see [the Docker README](../docker/README.md#building).

Two cautions:

- Everything in a bucket with a public hostname can be read by anyone who has the object's address. R2 has no per-object privacy. Whether Medusa's "private" files (import and export files) end up in this bucket was not checked; confirm before relying on them being private.
- The storefront passes images through the Next.js image optimizer on the server, which downloads them from this hostname. That traffic is free of egress charges on R2 but counts as Class B operations.

## 2. Backup bucket

**Needs explicit approval — nothing created.**

Encrypted database backups written by `infrastructure/ops/backup.sh` with restic. The procedure is in [docs/backup-and-restore.md](../../docs/backup-and-restore.md).

| Setting | Value |
|---|---|
| Bucket name | To be chosen, for example `bonanza-backups` |
| Public access | None: no custom hostname, `r2.dev` address off |
| API token | A second R2 token, limited to this bucket, Object Read & Write. Never the media token: a leak of the application's key must not reach the backups. |
| CORS | None |

```bash
wrangler r2 bucket create bonanza-backups   # not run
```

The values go into `/opt/bonanza/backup.env` (`RESTIC_REPOSITORY=s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<path>` and the token's key pair). Retention keeps 7 daily, 4 weekly and 6 monthly dumps, so the bucket holds roughly seventeen times the size of one dump.

## 3. Tunnel

**Needs explicit approval — nothing created.**

The only way into the server in production. `cloudflared` on the server dials out; no inbound web port is open.

Created in the dashboard (Zero Trust → Networks → Tunnels → Create a tunnel, connector type cloudflared). The Compose stack runs the connector from a token, so this is a dashboard-managed tunnel; nothing is installed on the server by hand.

| Public hostname | Service |
|---|---|
| The storefront hostname | `http://caddy:80` |
| The API hostname | `http://caddy:80` |
| The dashboard hostname (add it only after item 4 exists) | `http://caddy:80` |
| Optional: `www` | `http://caddy:80`, which redirects it |

- Leave the HTTP Host header setting empty, so Caddy sees the public hostname and can route by it.
- Adding a public hostname creates its DNS record in the zone.
- The tunnel token goes into `/opt/bonanza/.env` as `TUNNEL_TOKEN`, with `COMPOSE_PROFILES=tunnel`. The token is a secret: anyone who has it can run a connector for this tunnel.
- On the zone, switch on "Always Use HTTPS". The applications assume browsers use HTTPS: Caddy sends an HSTS header and Medusa's admin session cookie is `Secure`.

The `cloudflared` service in `compose.prod.yaml` has never been started. It needs this tunnel to exist.

## 4. Access on the dashboard hostname

**Needs explicit approval — nothing created.**

A second sign-in in front of the admin dashboard, before a request reaches the server. Medusa's own sign-in stays in place behind it.

Created in the dashboard (Zero Trust → Access controls → Applications → Create new application → Self-hosted).

| Setting | Value |
|---|---|
| Public hostname | The dashboard hostname, whole host, no path |
| Policy | Allow, limited to the named email addresses of the staff |
| Sign-in method | One-time PIN by email needs no identity provider; a Google or Microsoft login can be added later |
| Session duration | To be chosen, for example 24 hours |

- **Create this application before adding the dashboard hostname to the tunnel** (item 3). In the other order the dashboard is public for as long as the gap lasts.
- In the tunnel's settings for that hostname, switch on "Protect with Access", so the connector rejects any request that did not pass Access.
- The API and storefront hostnames must not be behind Access: shoppers and payment webhooks use them.
- Zero Trust has a free plan with a limit on the number of users; the limit and whether sign-up asks for a payment method were not confirmed here.
- In `direct` ingress mode Cloudflare is not in the path, so Access does not apply there.

## 5. One rate-limiting rule

**Needs explicit approval — nothing created.**

The Free plan, as documented on 2026-11-23, allows one rule that counts by IP address over 10 seconds and blocks for 10 seconds, and its expression can match on the URL path only (not on hostname or method). The proposal is to spend that rule on the sign-in and account paths:

| Setting | Proposed value |
|---|---|
| Expression | `(starts_with(http.request.uri.path, "/auth/")) or (http.request.uri.path contains "/account/")` |
| Counted by | IP address |
| Threshold | 40 requests per 10 seconds |
| Action | Block for 10 seconds |

`/auth/` covers sign-in on the API and dashboard hostnames. `/account/` covers the storefront's sign-in, registration and password-reset forms in all three languages. Because the method cannot be matched, page views of those paths are counted too, which is why the threshold is well above what a person produces. The numbers are a starting point and have not been tried against real traffic.

This is a coarse flood limit. The backend has its own, stricter limits per address and per email (`apps/backend/src/api/middlewares.ts`).

## If deployments from GitHub are approved later

**Needs explicit approval — nothing created.**

`.github/workflows/deploy-backend.yml` describes one way for a GitHub-hosted runner to reach a server whose SSH port is closed to it: SSH through this tunnel, behind an Access application that admits a service token only. That would add a fourth public hostname of type SSH, one more Access application with a Service Auth policy, and one service token. None of it is needed to run the store, and the workflow does nothing until it is built.

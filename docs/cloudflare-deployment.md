# Cloudflare: the planned setup, and the Workers option

Cloudflare has two possible roles in this project. The first is planned: it stands in front of the server and provides DNS, the CDN, storage for images and backups, the only way into the server, and a second sign-in in front of the admin. The second is optional: hosting the storefront itself on Cloudflare Workers instead of on the server.

**Nothing described here exists.** No Cloudflare account is connected to this project, no login was performed, and no command in this document has been run against an account. Every item below is marked **Not created; needs the owner's explicit approval**, and stays that way until the owner says otherwise.

The item-by-item settings are in [infrastructure/cloudflare/README.md](../infrastructure/cloudflare/README.md). This document explains how the items fit together and adds what that file leaves out: DNS, what the CDN can cache, and the Workers target. Where the two overlap, the README is the reference for exact values.

## What has to be true first

| Prerequisite | Why | Status |
|---|---|---|
| A domain the owner controls | Every item below hangs off a zone: tunnel hostnames, the media hostname, Access. `bonanza.co.il` is registered by someone else ([discovery.md](discovery.md#domain)). | **Blocked on the owner.** Buying a domain costs money. |
| A Cloudflare account, with the domain added as a zone | | **Not created; needs the owner's explicit approval** |
| A payment method on that account | Cloudflare's documentation says R2 is added to an account through a checkout step, and that Zero Trust sign-up asks for payment details even on the free plan ([cost-estimate.md](cost-estimate.md#cloudflare)). This was not confirmed for a real account. | **Not created; needs the owner's explicit approval** |

Until then the project uses temporary addresses, and every hostname is a setting: `STOREFRONT_HOST`, `API_HOST`, `DASHBOARD_HOST` and the optional `STOREFRONT_WWW_HOST` in the server's `.env`.

## The planned setup at a glance

| Item | What it is for | Expected cost | Status |
|---|---|---|---|
| [DNS](#dns) | The domain's records, served by Cloudflare | $0 | **Not created; needs the owner's explicit approval** |
| [CDN](#what-the-cdn-can-and-cannot-cache) | Cloudflare's edge in front of the storefront, API and dashboard hostnames | $0 | Comes with the hostnames below. **Not created; needs the owner's explicit approval** |
| [Media bucket (R2)](#media-bucket-r2) | Product and content images | $0 inside R2's free allowance | **Not created; needs the owner's explicit approval** |
| [Backup bucket (R2)](#backup-bucket-r2) | Encrypted database backups | $0 inside the same allowance | **Not created; needs the owner's explicit approval** |
| [Tunnel](#the-tunnel-and-the-two-ingress-profiles) | The only way into the server | $0 | **Not created; needs the owner's explicit approval** |
| [Access](#access-in-front-of-the-dashboard) | A second sign-in in front of the admin dashboard | $0 on the free plan | **Not created; needs the owner's explicit approval** |
| [One rate-limiting rule](#the-single-rate-limiting-rule) | A coarse flood limit on sign-in paths | $0: the Free plan includes one | **Not created; needs the owner's explicit approval** |

What can cost money, and the allowances, are in [cost-estimate.md](cost-estimate.md#cloudflare). The short version: R2 has a meter and no spending cap, and everything else on this list is free on Cloudflare's free plans as published on 2026-11-23.

## DNS

**Not created; needs the owner's explicit approval.** Changing a domain's nameservers is one of the approval gates in [cost-estimate.md](cost-estimate.md#actions-that-would-start-costing-money).

- `.co.il` domains cannot be registered through Cloudflare. The domain stays with an Israeli registrar, and its nameservers are pointed at Cloudflare there.
- The records for the storefront, API and dashboard hostnames are not written by hand. Adding a public hostname to the tunnel creates its record.
- The media hostname is attached to the R2 bucket as a custom domain, in the bucket's own settings.
- Whichever service is chosen for sending email will ask for records of its own. That service has not been chosen.
- On the zone, switch on "Always Use HTTPS". The applications assume browsers use HTTPS: the proxy sends an HSTS header and the admin's session cookie is marked `Secure`.

The planned hostnames are listed in [architecture.md](architecture.md#hostnames).

## What the CDN can and cannot cache

**Not created; needs the owner's explicit approval.** The CDN is not a separate thing to set up. A hostname that reaches the server through the tunnel passes through Cloudflare's edge, which is the CDN.

Cloudflare's default, from its documentation (read on 2026-11-23): it caches by file extension, it "does not cache HTML or JSON by default", and it does not cache a response whose `Cache-Control` says `private`, `no-store`, `no-cache` or `max-age=0`, or that sets a cookie.

Set against how the storefront renders its pages (`apps/storefront/next.config.ts` and the page files under `apps/storefront/app`):

| What | How the storefront serves it | At Cloudflare, with default settings |
|---|---|---|
| Build files under `/_next/static/` (scripts, styles, the three fonts) | Files with a content hash in their names | Cached, by file extension. This is where most of the benefit is. |
| Images in the media bucket | Served from the bucket's own hostname, not from the server | Served by Cloudflare directly. |
| Pictures resized by the storefront (`/_next/image`) | Produced by the Next.js image optimizer on the server | The address has no file extension, so the default rule should not cache it. To be checked on a deployed site. |
| Home page, product pages, the brands list, content pages, the gallery | Rendered on first request, then kept by the storefront for 5 minutes and refreshed when the backend says content changed. They never read a cookie, so one copy is right for every visitor. On a local production build, `/`, `/gallery` and product pages were seen to answer with `s-maxage=300` ([security.md](security.md#11-personal-pages-are-not-cached)). | **Not cached**, because they are HTML. They could be; see below. |
| Catalog listings: `/products`, category pages, brand pages | Rendered for each request, because they depend on the search, filters, sorting and page number | Not cached. |
| Cart, checkout, account and order pages, in all three languages | Rendered for each request. `next.config.ts` adds `Cache-Control: private, no-store` to them explicitly, with and without the `/en` and `/ar` prefixes. A browser test asserts `no-store` on the cart, checkout and sign-in pages, with samples from all three languages, and it passed against a production build on 2026-11-23. Order pages are covered by the same rule and are not in that test. | **Never cached.** |
| `/api/cart` (the cart badge and sign-in state) | Sets `private, no-store` itself. Covered by the same test. | Never cached. |

So with Cloudflare's defaults the edge serves the static files and the server renders every page. That is the planned starting point, and it is all that [the README's list](../infrastructure/cloudflare/README.md#the-list) includes.

**Caching the cookie-free pages at the edge is possible and is not part of the plan.** It would take a Cache Rule, which is not on the approved list, and it has three consequences that need deciding first:

- **Content changes would arrive later.** When staff save a change, the backend tells the storefront to refresh ([cms-management.md](cms-management.md#how-long-a-change-takes-to-reach-the-site)). That call does not reach Cloudflare. A copy held at the edge would stay until its own time ran out.
- **Content preview uses cookies.** A member of staff looking at a draft must never be served a cached public page, and a visitor must never be served a cached draft. The rule would have to bypass the cache whenever the preview cookies are present.
- **The personal pages must stay out.** They already say `no-store`, which Cloudflare honours by default. A rule that overrides the origin's cache headers would break that.

The headers above were observed on a development machine, without the proxy or Cloudflare in front. Check them again on the deployed stack before writing any rule, together with the items under "Checks to run against the deployed stack" in [security.md](security.md#pre-launch-security-checklist), which include confirming that Cloudflare reports the personal pages as not cached.

In `direct` ingress mode Cloudflare is not in the path and none of this applies.

## Media bucket (R2)

**Not created; needs the owner's explicit approval.**

Product and content images. The backend uploads through the S3 API using Medusa's S3 file provider; shoppers load images from the bucket's public hostname. Without a bucket, uploads go to a Docker volume on the server that is not backed up, which is acceptable for a trial only.

The provider is switched on by setting `S3_BUCKET`. These are the variables, as documented in `.env.example` and `infrastructure/docker/.env.production.example`:

| Variable | Value for R2 |
|---|---|
| `S3_BUCKET` | The bucket's name |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_FILE_URL` | The bucket's public hostname as `https://…`, with no trailing slash |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | The key pair of an R2 token limited to this bucket, with Object Read & Write |
| `S3_PREFIX` | Optional. A folder inside the bucket. |
| `S3_FORCE_PATH_STYLE` | `false` for R2 |

Three things that are easy to miss:

- **The storefront image has to be built knowing the media hostname** (`IMAGE_HOSTNAMES`, a build argument). An image built without it refuses pictures from the bucket, and setting the variable on a running container changes nothing. See [the Docker README](../infrastructure/docker/README.md#building).
- **Everything in a bucket with a public hostname is readable by anyone who has the address.** Whether Medusa's "private" files, such as import and export files, end up in this bucket was not checked.
- **This path has never met a real R2 bucket.** `apps/backend/medusa-config.ts` switches off ACLs and the newer checksum headers for R2's sake; those settings have not been tested against R2. The same code can be exercised locally against MinIO ([local-development.md](local-development.md#testing-uploads-against-s3-instead-of-local-disk)).

The bucket's public access, its token and its CORS policy are specified in [the README](../infrastructure/cloudflare/README.md#1-media-bucket).

## Backup bucket (R2)

**Not created; needs the owner's explicit approval.**

A second, private bucket holds the encrypted database backups that `infrastructure/ops/backup.sh` writes with restic. It has no public hostname, and its own token: a leak of the application's key must not reach the backups. The settings go in `/opt/bonanza/backup.env` (`RESTIC_REPOSITORY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`), and the procedure is in [backup-and-restore.md](backup-and-restore.md#one-time-setup).

Both buckets share R2's one free allowance. Retention keeps 7 daily, 4 weekly and 6 monthly dumps, so the backup bucket holds roughly seventeen times the size of one dump; [cost-estimate.md](cost-estimate.md#cloudflare) works out when that reaches the allowance.

**Backup and restore have never been run against real object storage.**

## The tunnel and the two ingress profiles

**Not created; needs the owner's explicit approval.**

The server can let web traffic in by one of two routes. `COMPOSE_PROFILES` in the server's `.env` chooses which containers run.

| | `tunnel` | `direct` |
|---|---|---|
| Meant for | Production | Testing before the domain is on Cloudflare |
| Containers | `cloudflared` and `caddy` | `caddy-direct` |
| How a visitor arrives | Cloudflare's edge, then the tunnel that `cloudflared` keeps open from inside the server, then `http://caddy:80` | Straight to the server's public address |
| Ports open on the server for web traffic | None | 80 and 443 |
| TLS | Ends at Cloudflare | Caddy obtains a certificate for each hostname itself |
| CDN, Access, rate-limiting rule | Apply | **Do not apply.** Cloudflare is not in the path, and nothing stands in front of the dashboard except Medusa's own sign-in. |
| Needs from Cloudflare | A tunnel and its token (`TUNNEL_TOKEN`) | Nothing |

The mode is also set in the Terraform variables and the server's firewall, and the three must agree; see [oracle-deployment.md](oracle-deployment.md#8-the-two-ingress-modes).

For the tunnel itself:

- It is created in the Cloudflare dashboard, and the Compose stack runs the connector from the tunnel's token. Nothing is installed on the server by hand.
- It carries three public hostnames, and optionally `www`, all pointing at `http://caddy:80`. Caddy tells them apart by the hostname in the request, so the tunnel must pass the public hostname through unchanged.
- **Add the dashboard hostname only after its Access application exists.** In the other order the dashboard is public for as long as the gap lasts.
- The token is a secret. Anyone who has it can run a connector for this tunnel.

The exact steps are in [the README](../infrastructure/cloudflare/README.md#3-tunnel).

**What has been checked.** The `tunnel` profile was exercised locally with everything except the tunnel: the proxy's rules, headers and limits were tested with its port published by a test override. **`cloudflared` has never been started**, because there is no tunnel for it to connect to. Admin sign-in through Cloudflare has not been tried either; it depends on Cloudflare telling the server that the browser used HTTPS. The full list is the [validation record](../infrastructure/docker/README.md#validation-record).

## Access in front of the dashboard

**Not created; needs the owner's explicit approval.**

Every admin user has full access to the store, and there are no roles ([security.md](security.md#no-roles-or-permissions-for-admin-users)). Cloudflare Access puts a second sign-in in front of the dashboard hostname, before a request reaches the server at all. Medusa's own sign-in, with its two-factor option ([security.md](security.md#13-two-factor-sign-in-for-admins-mfa)), stays in place behind it.

- The application covers the whole dashboard hostname and allows a named list of staff email addresses. A one-time code sent by email needs no identity provider.
- In the tunnel's settings for that hostname, "Protect with Access" makes the connector reject anything that did not pass Access.
- The storefront and API hostnames must **not** be behind Access. Shoppers use them, and so will the payment provider's notifications.
- Cloudflare's plan page puts the free plan at up to 50 users ([cost-estimate.md](cost-estimate.md#cloudflare)); this project needs a handful.

The settings are in [the README](../infrastructure/cloudflare/README.md#4-access-on-the-dashboard-hostname).

Access is a compensation for the missing roles, not a replacement. It decides who may reach the sign-in page, not what a signed-in admin may do.

## The single rate-limiting rule

**Not created; needs the owner's explicit approval.**

Cloudflare's Free plan includes one rate-limiting rule. As documented on 2026-11-23 it counts by IP address over 10 seconds, blocks for 10 seconds, and can match on the URL path only. The proposal is to spend it on the sign-in and account paths:

| Setting | Proposed value |
|---|---|
| Expression | `(starts_with(http.request.uri.path, "/auth/")) or (http.request.uri.path contains "/account/")` |
| Counted by | IP address |
| Threshold | 40 requests per 10 seconds |
| Action | Block for 10 seconds |

It is a coarse flood limit. The numbers are a starting point and have not been tried against real traffic. The precise limits, per address and per email, are the backend's own ([security.md](security.md#3-rate-limiting)), and those work with or without Cloudflare.

## The Workers target for the storefront

The storefront can be built a second way, to run on Cloudflare Workers instead of in a container on the server. That build is configured, and it has been built and previewed on a development machine. It is **not the default and not deployed**, and nothing for it exists at Cloudflare.

### Why it is not the default

The owner's first preference was to host the storefront on Workers at no cost. Two findings, both from Cloudflare's own documentation, changed that ([cost-estimate.md](cost-estimate.md#cloudflare) has the sources):

- **The Free plan allows 10 ms of CPU time per request.** Cloudflare's documentation says workloads that render pages on the server typically use 10 to 20 ms, and that a request over the limit fails with error 1102. A store whose pages fail now and then is not acceptable.
- **The plan that removes that limit costs money.** Workers Paid starts at $5 a month per account.

So the default storefront host is a container on the server, behind Cloudflare's CDN, at $0. Moving to Workers is an optional upgrade and the owner's decision.

### What is in place

| File or script | What it is |
|---|---|
| `apps/storefront/wrangler.jsonc` | The Worker's configuration. Its names are placeholders. |
| `apps/storefront/open-next.config.ts` | How the OpenNext adapter stores cached pages and cache tags |
| `pnpm --filter @bonanza/storefront cf:build` | Builds the Worker. Contacts no Cloudflare account. |
| `pnpm --filter @bonanza/storefront cf:preview` | Builds, then runs the Worker locally |
| `pnpm --filter @bonanza/storefront cf:deploy` | Builds, then **publishes to Cloudflare. Do not run it without the owner's approval.** |
| `.github/workflows/deploy-storefront-workers.yml` | A manual check that the build still works. It deploys nothing. See [github-actions.md](github-actions.md#storefront-on-workers-deploy-storefront-workersyml-inert). |

`@opennextjs/cloudflare` and `wrangler` are development dependencies of the storefront. No Cloudflare login has been performed for this project.

The bindings in `wrangler.jsonc`, and what each is for:

| Binding | Kind | What it is for | To create before a deployment |
|---|---|---|---|
| `ASSETS` | Static assets | Serves the build's static files from `.open-next/assets` | Nothing. It is part of the Worker. |
| `WORKER_SELF_REFERENCE` | A service binding to the Worker itself | The Worker calls itself to refresh cached pages. The service name must match the Worker's `name`. | Nothing. |
| `NEXT_INC_CACHE_R2_BUCKET` | R2 bucket, `bonanza-storefront-cache` | The cache of rendered pages | The bucket. It would be a third bucket, counted against the same R2 allowance. |
| `NEXT_TAG_CACHE_D1` | D1 database, `bonanza-storefront-tags` | Cache tags, so that the backend's "content changed" call reaches every running copy of the Worker | The database. The `database_id` in the file is a placeholder of zeros and has to be replaced with the real one. |

Also in the file:

- `vars` holds two non-secret settings, `ALLOW_INDEXING` and `DEFAULT_COUNTRY`. Secrets (`REVALIDATE_SECRET`, `CMS_PREVIEW_SECRET`) are meant to be set on the Worker with `wrangler secret put`, and locally in a `.dev.vars` file, which is gitignored.
- The Cloudflare Images binding is left out on purpose, because it is billed beyond a small allowance. Without it images are served as uploaded.
- Background refreshes of cached pages are de-duplicated in memory (`memoryQueue`), which needs no further Cloudflare product.

The application code is kept portable between the two targets: no Cache Components, no edge runtime, every setting read from the environment.

### What has been verified, and what has not

Verified by the lead engineer on a development machine on 2026-11-23:

| Check | Result |
|---|---|
| `pnpm --filter @bonanza/storefront cf:build` | Completed. |
| The local preview (`opennextjs-cloudflare preview`, Cloudflare's emulator) | Answered 200 for `/`, `/en`, `/ar`, `/gallery`, `/products` with and without a query, a product page, `/cart`, `/account/login` and `/sitemap.xml`, and 404 for an unknown address. |

That shows the Worker builds and that its pages render in the emulator. It does not show how it behaves at Cloudflare:

- **Nothing was deployed.** No Worker, no `workers.dev` preview.
- **No real R2 bucket or D1 database exists.** The preview used the emulator's local stand-ins, so the page cache and the cache tags have never run against the real services, and the D1 database has never been created or prepared.
- **Performance under the real CPU limit is unmeasured.** The reason for needing a paid plan is a figure from Cloudflare's documentation, not a measurement of this storefront.
- **The check was that pages answer.** Completing a purchase, signing in and the content refresh call were not reported as tried in the preview, and the browser suite has not been run against it.
- **The GitHub workflow that runs the same build has never been started.**

Not designed or tested either, from reading the code:

- **How the two servers reach each other.** On the server, the storefront calls the backend over a private network, and the backend calls the storefront's `/api/revalidate` the same way; the proxy refuses that address from outside. A Worker is outside. The storefront would call the public API hostname, and the backend would call the Worker's public address, protected by the shared secret alone. `compose.prod.yaml` fixes `STOREFRONT_INTERNAL_URL` to the container's address, so that file would have to change.
- **Per-visitor rate limiting** relies on the visitor's address as the storefront sees it. That was worked out for the proxy on the server, not for a Worker.
- **The other settings the storefront reads** (`SITE_URL`, `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`, and `IMAGE_HOSTNAMES` at build time) are not in `wrangler.jsonc`.

### `vinext` or `@opennextjs/cloudflare`

There are two ways to run a Next.js application on Workers. Both were looked at before any code was written, and again on 2026-11-23 against Cloudflare's guide and the `vinext` README.

| | `vinext` | `@opennextjs/cloudflare` |
|---|---|---|
| What it is | A reimplementation. In its README's words it "reimplements the Next.js API surface on Vite rather than consuming `next build` output". | An adapter. It takes the output of a normal `next build` and wraps it for Workers. |
| Cloudflare's position | Its guide "recommends vinext as the default way to run Next.js applications on Cloudflare Workers", and states "vinext is in beta". | Listed as the path for an existing OpenNext application that cannot yet move to `vinext`. |
| What its own README says about production | "it is not yet a drop-in replacement for every application or production workload". On production use: "You can, with caution." | The `vinext` README calls OpenNext "the safer choice" for anyone who needs "a mature, well-tested way to run Next.js outside Vercel". |
| Differences that matter to this storefront | Its README says "Google Fonts are loaded from the CDN", where this storefront serves its three fonts itself so that no request leaves for a font host. It also says the build-time image pipeline is not reproduced. | Starts from the same Next.js build as the container image. |
| Decision | Not adopted. | Adopted for the optional Workers target. Version 1.20.18 is in the lockfile. |

The reasoning: a store should not depend on a beta reimplementation of its framework when a more mature adapter that runs the real framework exists. Keeping one Next.js build for both targets also means the application code that is tested is the code that would run on Workers, even though the hosting around it differs.

**One thing the plan said and that was not done.** The project plan, and `architecture.md` after it, say that `vinext check` runs in CI as a non-blocking signal, to keep a later move cheap. It does not. `vinext` is not a dependency of any package in this repository, and no workflow runs it. Either add it or drop the sentence from `architecture.md`.

## Steps to go live later

Each step creates or changes something at Cloudflare or at the registrar. **Each needs the owner's explicit approval, and none has been taken.** The order matters in two places, marked below.

| # | Step | Costs money | Approval |
|---|---|---|---|
| 1 | Acquire a domain | Yes | Owner |
| 2 | Create or choose the Cloudflare account, and add the domain as a zone on the Free plan | No | Owner |
| 3 | Point the domain's nameservers at Cloudflare, at the registrar | No | Owner. A DNS change. |
| 4 | Add R2 to the account | No charge expected. It puts a payment method on file, and R2 has no spending cap. | Owner |
| 5 | Create the media bucket, attach its public hostname, create its token and CORS policy | Inside the free allowance | Owner |
| 6 | Create the backup bucket and its own token | Inside the same allowance | Owner |
| 7 | Build the storefront image with the media hostname, and the backend image with the storefront's address ([github-actions.md](github-actions.md#images-imagesyml)) | No | Owner starts the build |
| 8 | Complete Zero Trust sign-up | No charge expected. It asks for payment details. | Owner |
| 9 | Create the tunnel with the storefront and API hostnames. Put its token in the server's `.env`. | No | Owner |
| 10 | Create the Access application for the dashboard hostname. **Only then** add that hostname to the tunnel, with "Protect with Access" on. | No, up to the free plan's user limit | Owner |
| 11 | Switch on "Always Use HTTPS" and create the rate-limiting rule | No | Owner |
| 12 | Fill in the `S3_*` values on the server, deploy, and run the checks in [security.md](security.md#pre-launch-security-checklist) from outside | No | Owner. This makes the site reachable. |
| 13 | Set `ALLOW_INDEXING=true`, on the real domain only | No | Owner. This is the public launch. |

Step 12 before step 13: the site should be checked from outside while search engines are still kept away.

Moving the storefront to Workers is a separate decision on top of these, with its own open points under [What has been verified, and what has not](#what-has-been-verified-and-what-has-not) and its own cost.

Where this sits among everything else that has to happen before a launch is in [production-readiness.md](production-readiness.md#suggested-order-of-steps-to-a-first-public-deployment).

## Sources

Read on 2026-11-23. Vendors change these pages without notice.

| Topic | Page |
|---|---|
| What Cloudflare caches by default | `https://developers.cloudflare.com/cache/concepts/default-cache-behavior/` |
| Cache Rules and how many each plan has | `https://developers.cloudflare.com/cache/how-to/cache-rules/` |
| Cloudflare's guide to Next.js on Workers | `https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/` |
| The `vinext` README | `https://github.com/cloudflare/vinext` |
| Workers limits and prices, R2, D1, Zero Trust, rate limiting | Listed in [cost-estimate.md](cost-estimate.md#sources) |

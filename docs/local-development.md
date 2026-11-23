# Local development

This guide gets the whole system running on one machine and covers the commands used day to day. The backend and the storefront run directly on your machine so that code changes reload quickly; PostgreSQL, Redis and a mail catcher run in Docker.

Everything here is local. Nothing in this guide creates a cloud resource, sends a real email or takes a real payment.

## Prerequisites

| Tool | Version | Where the requirement comes from |
|---|---|---|
| Node.js | 22.22 or newer. 24 LTS is what the project is developed and built on. | `engines` in `package.json`; the Dockerfiles use Node 24 |
| pnpm | 12 (the repository pins 12.3.4) | `packageManager` in `package.json` |
| Docker with the Compose plugin | Any version that has `docker compose up --wait` | `compose.yaml`, `scripts/setup-dev.mjs` |

These ports must be free. The Docker services publish theirs on `127.0.0.1` only.

| Port | Used by |
|---|---|
| 8000 | Storefront |
| 9000 | Backend: Store API, Admin API, admin dashboard |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 1025, 8025 | Mailpit (SMTP, web page) |
| 9100, 9101 | MinIO, only with the `s3` profile |

## First run

```bash
pnpm install
pnpm dev:setup
pnpm dev
```

### What `pnpm dev:setup` does

It runs `scripts/setup-dev.mjs`, which does six things in order. Every step skips what already exists, so it is safe to run again.

1. **Writes the env files** `apps/backend/.env` and `apps/storefront/.env.local` from `.env.example`. A file that already exists is left unchanged.
2. **Starts PostgreSQL, Redis and Mailpit** with `docker compose up -d --wait`.
3. **Runs the database migrations** (`medusa db:migrate` in `apps/backend`). The first run also creates the store's base setup: sales channel, publishable API key, the Israel region in ILS with VAT-inclusive prices, the 18% tax region, a stock location and the delivery and pickup zones.
4. **Creates the first admin user** from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `apps/backend/.env`. If the user exists, it says so and moves on.
5. **Copies the publishable API key** from the database into `MEDUSA_PUBLISHABLE_KEY` in `apps/storefront/.env.local`.
6. **Loads the demo catalog and content** (`src/scripts/seed-demo.ts`).

It accepts two flags. Pass them to the script directly:

| Command | Effect |
|---|---|
| `node scripts/setup-dev.mjs --no-seed` | Does steps 1 to 5 and skips the demo data. |
| `node scripts/setup-dev.mjs --env-only` | Does step 1 and stops. Nothing is started and the database is not touched. |

There is no dry run and no help text. Any other argument is ignored, so `node scripts/setup-dev.mjs --help` runs the full setup.

### What `pnpm dev` does

It runs `turbo dev`, which starts both applications and keeps them running:

- the backend with `medusa develop` (port 9000),
- the storefront with `next dev -p 8000`.

To start only one of them, use `pnpm backend:dev` or `pnpm storefront:dev`. Run **one** copy of each; see [Troubleshooting](#troubleshooting).

## Local addresses

| What | Address |
|---|---|
| Storefront, Hebrew | http://localhost:8000 |
| Storefront, English and Arabic | http://localhost:8000/en and http://localhost:8000/ar |
| Admin dashboard | http://localhost:9000/app |
| Backend health check | http://localhost:9000/health |
| Captured emails (Mailpit) | http://localhost:8025 |
| MinIO console (`s3` profile only) | http://localhost:9101 |

**The admin sign-in** is the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values in `apps/backend/.env`. That file is generated on your machine, is readable only by you, and is never committed.

Those two values are used once, when the user is created. Changing them in the file later does not change the existing user's password. To change it, use "forgot password" on the dashboard's sign-in page and open the email in Mailpit, or create another admin user:

```bash
cd apps/backend
pnpm exec medusa user -e <email> -p <password>
```

Every email the backend sends locally (order confirmations, password resets) is caught by Mailpit and delivered nowhere.

## Environment files

`.env.example` in the repository root is the single documented list of variables. It holds no real secrets and is committed.

How the per-application files are produced from it:

- A line `#@file <path>` starts a section. Everything up to the next marker becomes that file. There are two sections today: `apps/backend/.env` and `apps/storefront/.env.local`.
- Every `NAME=__GENERATE__` is replaced with a fresh random value (32 random bytes, written as hex).
- A variable that appears in both files gets the same value in both. This is what keeps `REVALIDATE_SECRET` and `CMS_PREVIEW_SECRET` in step between the backend and the storefront, including when one of the files already exists. If the two sides disagree, cache refreshes, content preview and per-visitor rate limiting stop working.
- `MEDUSA_PUBLISHABLE_KEY` is filled in by step 5 of the setup, from the database.
- Files are written with mode 600 and are gitignored (`.env`, `.env.*`).

Rules of thumb:

- **Adding a variable:** add it to `.env.example` in the right section, with a comment, and add it by hand to your own file. The setup never edits a file that exists.
- **Regenerating a file:** delete it and run `node scripts/setup-dev.mjs --env-only`. Regenerating `apps/backend/.env` produces a new `ADMIN_PASSWORD` that the existing admin user does not have, and new signing secrets, so do it together with a [database reset](#resetting-the-local-database).
- **Never paste a value from these files** into an issue, a chat or a commit.

Four optional backend variables appear in `.env.example` as commented-out lines, so they are not set in a generated file. All have working defaults locally:

| Variable | Read in | Default when unset |
|---|---|---|
| `STOREFRONT_INTERNAL_URL` | `apps/backend/src/lib/revalidate.ts` | `STOREFRONT_URL` |
| `PAYMENT_DEV_GATEWAY_URL` | `apps/backend/medusa-config.ts` | `MEDUSA_BACKEND_URL` |
| `PAYMENT_DEV_CAPTURE_MODE` | `apps/backend/medusa-config.ts` | `automatic` (the other value is `manual`) |
| `JWT_EXPIRES_IN` | `apps/backend/medusa-config.ts` | `7d` |

### Testing uploads against S3 instead of local disk

By default uploaded images go to `apps/backend/static` on local disk. To exercise the S3 path that production uses, start MinIO and set the `S3_*` variables listed in the comments of `.env.example`:

```bash
docker compose --profile s3 up -d
```

**Known issue (2026-11-23):** the `minio/minio` and `minio/mc` images this profile names are no longer published on Docker Hub, so the command fails on a machine that has never pulled them. The S3 path has therefore not been exercised locally; the backup scripts were tested against a different S3-compatible server (see `infrastructure/docker/README.md`). Swap the two images in `compose.yaml` for another S3-compatible server before relying on this.

## Seed data

There are three pieces of seed code. Only one of them is demo data.

| Script | What it creates | How it runs | Safe for a real install |
|---|---|---|---|
| `apps/backend/src/migration-scripts/initial-data-seed.ts` | The structure every environment needs: sales channel, publishable key, store, the Israel region (ILS, VAT-inclusive, **no payment provider**), the tax region, a stock location, delivery and pickup zones. No products, no shipping options, no prices. | Automatically, once per database, as part of `medusa db:migrate` | Yes. It is part of every install. |
| `apps/backend/src/scripts/seed-content.ts` | A starter structure: product categories and tags, the home page sections, header and footer menus, site settings, and empty content pages as drafts. It only creates what is missing and does not overwrite anything edited in the admin. | `cd apps/backend && pnpm exec medusa exec ./src/scripts/seed-content.ts` | Yes, by design. Read the file first: it sets the booking link to the address written in it, and its English and Arabic texts are drafts for the owner to review. |
| `apps/backend/src/scripts/seed-demo.ts` | Invented brands and products with generated images, placeholder shipping prices, a sale, the discount code `BONANZA10`, sample gallery, team, reviews and price list, placeholder page text. It also attaches the simulated payment provider to the region. It runs `seed-content.ts` first. | `pnpm db:seed`, or step 6 of `pnpm dev:setup` | **No. Demo only.** It refuses to run when `APP_ENV=production`. |

The demo catalog loads once: when products already exist the script logs that and stops.

## Resetting the local database

This deletes all local data: products, orders, customers, content, queued jobs.

1. Stop `pnpm dev`.
2. Remove the containers and their volumes, then set up again:

   ```bash
   docker compose down -v
   pnpm dev:setup
   pnpm dev
   ```

`docker compose down -v` removes the PostgreSQL and Redis volumes (and MinIO's, if you used it). The env files are kept, so the admin sign-in stays the same. The new database has a new publishable API key; the setup writes it into `apps/storefront/.env.local`, and the storefront picks it up when it starts.

Images uploaded before the reset stay in `apps/backend/static`. That folder is gitignored and can be deleted; the demo seed uploads its images again.

## Day-to-day commands

All of these run from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Backend and storefront, reloading on change |
| `pnpm lint` | `medusa lint` in the backend, `eslint .` in the storefront |
| `pnpm typecheck` | TypeScript checks in the backend (server code and admin extensions), the storefront, `packages/types` and `e2e` |
| `pnpm test` | Unit tests of the storefront and the backend |
| `pnpm build` | Production builds of both applications |
| `pnpm format` | Prettier over the repository |
| `pnpm db:migrate` | Applies pending database migrations |
| `pnpm db:seed` | Loads the demo data (see [Seed data](#seed-data)) |
| `pnpm e2e` | The Playwright browser suite |

### Unit tests

| Workspace | Runner | Command | What exists today |
|---|---|---|---|
| Storefront | Vitest | `pnpm --filter @bonanza/storefront test` | `lib/format.test.ts`, `lib/site.test.ts`, `lib/i18n/index.test.ts`: prices, phone numbers, opening hours, the map address check, language paths, and that the three dictionaries have the same keys |
| Backend | Jest | `pnpm --filter @bonanza/backend test` | `src/lib/__tests__/*.unit.spec.ts`: signatures and signed tokens, publishing and banner-window rules, menu building, the price list, and the upload content check |

`pnpm test` at the root runs both. It does not start the browser suite, which needs the whole stack running and has its own command, `pnpm e2e`.

The backend also defines `test:integration:http` and `test:integration:modules`. No integration tests have been written; the behaviour they would cover (who may call what, drafts staying private, rate limits, the payment flow) is covered through the running system by the browser suite.

### Browser tests (Playwright)

The suite drives the real storefront and the real admin dashboard. It needs all of this to be true first:

- the Docker services are up and `pnpm dev:setup` has been run **with** the demo data (the tests buy demo products and use the demo discount code);
- `pnpm dev` is running;
- the simulated payment provider is on, which is the local default (`PAYMENT_DEV_ENABLED=true`);
- Playwright's browser has been downloaded once:

  ```bash
  pnpm --filter @bonanza/e2e exec playwright install chromium
  ```

Then:

```bash
pnpm e2e                                                    # everything
pnpm --filter @bonanza/e2e exec playwright test tests/checkout.spec.ts --project=desktop
pnpm --filter @bonanza/e2e run e2e:headed                   # watch it in a browser window
```

Things to know:

- There are two projects. `desktop` runs every spec. `mobile` (a Pixel 7 viewport) runs only `storefront.spec.ts`.
- Tests run one at a time, in order (`workers: 1`).
- The suite reads the admin sign-in from `apps/backend/.env` and the publishable key from `apps/storefront/.env.local`. `STOREFRONT_URL`, `BACKEND_URL` and `MAILPIT_URL` override the local addresses.
- It writes to your local database: it registers customers, places orders and edits content. It removes the banners and pages it creates; orders and customers stay.
- Before the run, `e2e/global-setup.ts` clears the backend's rate-limit counters in Redis, because the suite signs in far more often than a real visitor.

### The Cloudflare Workers build

The storefront has a second build target for Cloudflare Workers:

```bash
pnpm --filter @bonanza/storefront cf:build      # build only
pnpm --filter @bonanza/storefront cf:preview    # build and run locally
```

`cf:deploy` publishes to Cloudflare. **Do not run it without the owner's approval.** Nothing is deployed there today; see [cost-estimate.md](cost-estimate.md).

## Adding a migration to a custom module

The custom modules are in `apps/backend/src/modules`. Four of them have database tables: `cms`, `brand`, `activity-log` and `dev-gateway`.

1. Change or add the model under `apps/backend/src/modules/<module>/models/`. A new model also has to be passed to the module's service (see `service.ts` in the same folder).
2. With PostgreSQL running, generate the migration. The argument is the module's registered name, which is the string passed to `Module()` in the module's `index.ts`: `cms`, `brand`, `activity_log` or `dev_gateway`.

   ```bash
   cd apps/backend
   pnpm exec medusa db:generate cms
   ```

   If the name is not recognised, the command prints the list of names it accepts.
3. Review what was written to `apps/backend/src/modules/<module>/migrations/`: a new `Migration<timestamp>.ts`, and an updated `.snapshot-<module>.json`. Commit both.
4. Apply it:

   ```bash
   pnpm db:migrate
   ```

A migration can also be written by hand when the change is not a model change. `Migration20261123103800.ts` in the `cms` module is an example: it creates the PostgreSQL text search configuration that product search uses for Hebrew.

To undo the latest migration of a module locally: `pnpm exec medusa db:rollback cms`, from `apps/backend`.

A brand-new module must be added to `modules` in `apps/backend/medusa-config.ts` before `db:generate` can see it. The `dev-gateway` module is only loaded while `PAYMENT_DEV_ENABLED=true`.

In production, migrations are applied by the deployment script before the new version starts; see [oracle-deployment.md](oracle-deployment.md#first-deployment).

## Where things live

```
apps/backend/
  medusa-config.ts          modules, providers, CORS, the payment guard
  src/modules/              cms, brand, activity-log, dev-gateway, payment-dev-hosted, notification-smtp
  src/api/admin/            custom Admin API routes (content, brands, activity log)
  src/api/store/            custom Store API routes (content, brands, newsletter)
  src/api/dev-gateway/      the simulated payment gateway: its API and its payment page
  src/api/middlewares.ts    rate limits, upload checks, request validation
  src/api/validators.ts     the request schemas
  src/workflows/            every write goes through a workflow
  src/subscribers/          emails, storefront cache refresh, activity log
  src/lib/                  signing, rate limiting, upload checks, email templates
  src/admin/                dashboard extensions: content screens, brands, activity log
  src/search/               the product search index
  src/links/                the product-to-brand link
  src/migration-scripts/    the base store setup
  src/scripts/              seed-content, seed-demo and their assets
apps/storefront/
  app/[locale]/             every page; Hebrew is served without a prefix
  app/api/                  cart badge, content preview, cache refresh
  components/               interface components
  lib/medusa/               all calls to the backend (server only)
  lib/i18n/                 the Hebrew, English and Arabic texts
  lib/config.ts             every environment variable the storefront reads
  next.config.ts            security headers, language routing, image hosts
e2e/                        Playwright suite: tests/, global-setup.ts, playwright.config.ts
packages/types/             content types shared by the backend and the storefront
packages/config/            shared TypeScript and Prettier settings
infrastructure/             Docker, Oracle Cloud and operations files
scripts/                    setup-dev.mjs, shield-from-icloud.mjs and asset generators
compose.yaml                the local PostgreSQL, Redis, Mailpit and MinIO
.env.example                the documented list of variables
```

How the pieces fit together is described in [architecture.md](architecture.md).

## Troubleshooting

These are the problems that actually came up while building this project.

### More than one backend process is running

**Symptoms:** background work behaves inconsistently from one attempt to the next. Anything that runs after an event is affected: emails, the storefront cache refresh, payment webhooks.

**Cause:** two `medusa develop` processes are running, usually because one was left behind in another terminal. Both connect to the same Redis, so events and background jobs are split between them, and one of them may be running older code.

**Fix:** check, stop them all, start exactly one.

```bash
pgrep -fl "@medusajs/cli/cli.js develop"      # should print one line
pkill -f "@medusajs/cli/cli.js develop"
pnpm dev
```

### Docker Desktop reports storage errors

**Symptoms:** `docker compose up` fails, or PostgreSQL or Redis stops, with an error that comes from Docker's own storage and not from the database.

**Fix:** restart Docker Desktop, then bring the services back:

```bash
docker compose up -d --wait
```

If the errors continue after a restart, check free disk space on the machine and in Docker Desktop's settings before anything else.

### The storefront ignores a configuration change

**Symptoms:** a change to `apps/storefront/next.config.ts` or `apps/storefront/.env.local` (for example a new image hostname, or the publishable key after a database reset) has no effect.

**Cause:** the Next.js development server reads both at start-up, and an old server process may still be the one answering on port 8000.

**Fix:** stop the storefront and start it again. If it still behaves like the old configuration, delete the build cache `apps/storefront/.next` (gitignored) and start again.

### Sign-in or registration answers "too many requests"

**Symptoms:** signing in, registering or resetting a password fails with a "too many attempts" message, or the API answers 429. It typically happens after running tests by hand several times.

**Cause:** the backend's rate-limit counters are kept in Redis and outlive a backend restart. `pnpm e2e` clears them before each run (`e2e/global-setup.ts`); manual testing does not.

**Fix:** clear the counters. This is the same command the test setup runs:

```bash
docker compose exec -T redis sh -c "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del"
```

Setting `RATE_LIMIT_ENABLED=false` in `apps/backend/.env` and restarting the backend switches the limits off locally. Leave them on when you are testing sign-in behaviour.

### Commands hang for no visible reason on a Mac

**Symptoms:** the dev servers, a build or the tests stall without an error.

**Cause:** the repository is inside a folder that iCloud Drive syncs (Desktop or Documents with "Desktop & Documents Folders" switched on). iCloud uploads every dependency file and, when the disk runs low, removes local copies; reading such a file blocks until it has been downloaded again.

**Fix:** move the bulky generated folders out of iCloud's reach. `scripts/shield-from-icloud.mjs` renames each one to `<name>.nosync`, which iCloud skips, and leaves a link under the original name. The header of the script lists the folders it covers.

```bash
pnpm icloud:shield
```

Keeping the repository outside iCloud-synced folders avoids the problem altogether.

# BONANZA — Barbershop & Academy

Online store for professional barber equipment and grooming products. Hebrew, right-to-left, priced in ILS.

- **Backend and admin:** [Medusa](https://medusajs.com) 2.23 (`apps/backend`)
- **Storefront:** Next.js 16, React 19, Tailwind 4 (`apps/storefront`)
- **Data:** PostgreSQL 17, Redis 7

## Run it locally

You need Node 22.22 or newer (24 LTS recommended), pnpm 12 and Docker.

```bash
pnpm install
pnpm dev:setup     # env files, database, admin user, demo catalog
pnpm dev           # backend and storefront
```

| What | Where |
|---|---|
| Storefront | http://localhost:8000 |
| Admin dashboard | http://localhost:9000/app |
| Captured emails | http://localhost:8025 |

The admin sign-in is `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `apps/backend/.env`, which `pnpm dev:setup` generates. That file is never committed.

More detail: [docs/local-development.md](docs/local-development.md).

## Repository layout

```
apps/backend        Medusa: commerce, admin dashboard, content management
apps/storefront     Next.js storefront
packages/types      Content types shared by both apps
packages/config     Shared TypeScript and Prettier settings
infrastructure      Docker, Oracle Cloud, Cloudflare and operations files
docs                Architecture, deployment, security and operations guides
logos               Brand source files
photos-examples     Design references
```

## Documentation

| Document | Covers |
|---|---|
| [architecture.md](docs/architecture.md) | How the system fits together and why |
| [discovery.md](docs/discovery.md) | What was found before the build started |
| [local-development.md](docs/local-development.md) | Day-to-day development |
| [cms-management.md](docs/cms-management.md) | Editing site content in the admin |
| [payments-integration.md](docs/payments-integration.md) | The payment design and how to add a real provider |
| [security.md](docs/security.md) | Controls in place and known gaps |
| [oracle-deployment.md](docs/oracle-deployment.md) | Hosting the backend on Oracle Cloud |
| [cloudflare-deployment.md](docs/cloudflare-deployment.md) | DNS, CDN, media storage and the Workers build |
| [github-actions.md](docs/github-actions.md) | CI, image builds, deployment and rollback |
| [backup-and-restore.md](docs/backup-and-restore.md) | Backups, restore drills and disaster recovery |
| [cost-estimate.md](docs/cost-estimate.md) | What is free, what is not, and what could cause a charge |
| [production-readiness.md](docs/production-readiness.md) | Status and what blocks a public launch |

## Status

Under active development. Nothing is deployed publicly. Real payments are not connected.

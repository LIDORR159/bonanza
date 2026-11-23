# Discovery

What was found before any code was written. Checked on 2026-11-23 on the owner's development machine and against official documentation.

## Working directory

- Path: `barber-shop/`. It was not a git repository and contained no application code.
- Contents at the start:

| Path | What it is |
|---|---|
| `logos/header logo.png` | Primary brand lockup, 1983×793, transparent. BONANZA wordmark with an arched top edge and a straight bottom edge, the subtitle BARBERSHOP & ACADEMY, and a black-and-white barber pole. |
| `logos/logo.png` | Secondary wordmark, 2172×724, transparent. Straight lettering, no subtitle, same pole. Has a few stray marks along its bottom edge. |
| `photos-examples/*.webp` | Three design reference images (see below). |

The brief calls the reference folder `photo examples`; the folder on disk is `photos-examples`. It was left as it is.

## Design references

All three images show a concept brand called "CAPITANO". They define look and feel only. Their logos, photographs and product shots belong to a third party and are not reproduced in the store.

| File | Shows | What the store takes from it |
|---|---|---|
| `7915fd24…webp` | Desktop home page: header with logo, centered nav and cart icon; large bold headline, one-line sub-copy and a solid white button on one side; a black-and-white portrait on the other; three product cards overlapping the bottom of the hero. | Home hero layout (mirrored for RTL), header structure, card overlap. |
| `a72445…webp` | Alternative home page: full-bleed portrait hero with a centered headline, a nav bar with an underlined active item, four product cards with flat grey image wells, uppercase names and small prices. | Product card and catalog grid styling, nav active state. |
| `60f134…webp` | Editorial card on a sage background: black-and-white portrait beside a large serif quote in off-white. | The Barber Academy section and other editorial blocks. |

Shared visual language: near-black charcoal backgrounds, white type, muted grey secondary text, hairline borders, small corner radii, soft depth, heavy grotesk headlines. Sage with a serif face appears once, as an accent.

Both logo files are white with a black outline, so they are made for dark backgrounds, which matches the references.

## Tooling on the development machine

| Tool | Version | Note |
|---|---|---|
| git | 2.50.1 | |
| gh | 2.96.0 | Signed in to two accounts (see GitHub below) |
| Node.js | 24.14.1 | Medusa 2.23 requires ≥ 22.22 |
| pnpm | 12.3.4 | |
| Docker | 29.6.1 | ARM64 (aarch64), 8.3 GB assigned. Same CPU architecture as Oracle Ampere A1 |
| Docker Compose | v5.2.0 | |
| Terraform | 1.14.4 | |
| psql | 18.4 | Client only |
| `oci` CLI | not installed | No `~/.oci` configuration either |
| `wrangler` | not installed | No Cloudflare login found |

## Account access

### GitHub

- The brief names the owner `lidor1594`. GitHub returns 404 for that name: no such user or organization exists.
- The machine is signed in to GitHub as `LIDORR159`, which is the account the repository lives under.
- **Decision (owner):** the repository is `LIDORR159/bonanza`, private.
- GitHub Free on a private repository does not offer branch protection, rulesets, or deployment environments. See `github-actions.md`.

### Oracle Cloud

- No CLI and no configuration on the machine, so tenancy, home region, current usage and A1 availability could not be inspected.
- These checks are scripted in `infrastructure/oracle/oci-discovery.sh` and run after the owner signs in with `oci session authenticate`. Nothing is created before the owner approves the resulting resource and cost plan.

### Cloudflare

- No CLI and no login. No Cloudflare resource has been inspected or created.

## Domain

- `bonanza.co.il` is already registered. Its nameservers belong to a domain marketplace/parking service and it resolves to an address on AWS. This is the usual pattern for a domain held by someone else or listed for sale.
- **Decision (owner):** the domain is not under the owner's control yet. The project is built around temporary URLs; every hostname is an environment variable. Acquiring the domain is a production blocker.
- `.co.il` domains cannot be registered through Cloudflare. The domain stays with an Israeli registrar and its nameservers are pointed at Cloudflare.

## Facts verified against official documentation

These shaped the architecture. Sources and details are in `architecture.md`, `oracle-deployment.md` and `cloudflare-deployment.md`.

| Topic | Finding |
|---|---|
| Medusa | Latest stable is 2.23.0 (2026-11-20). `create-medusa-app` scaffolds a pnpm + Turborepo monorepo with the backend at `apps/backend`. The admin is served at `/app`, not `/admin`. |
| Medusa licensing | Role-based access control, the audit log and SSO require a paid Enterprise license. Open-source Medusa gives every admin user full access and has no built-in rate limiting. |
| Medusa for Israel | ILS and Israel are built in. Tax-inclusive pricing is supported. The admin ships a Hebrew RTL translation. The Translation module includes `he-IL`. |
| Oracle Always Free | Ampere A1 allowance is 1,500 OCPU-hours and 9,000 GB-hours per month: 2 OCPU and 12 GB in total. Enforced since August 2026. Home region only. 200 GB block storage in total. |
| Cloudflare Workers Free | 10 ms CPU per request and 100,000 requests per day. Cloudflare's own documentation puts server-side rendering at 10–20 ms, so a server-rendered storefront does not fit reliably. Workers Paid is $5 per month. |
| Next.js on Cloudflare | Cloudflare's docs now default to `vinext` (labelled beta). The OpenNext adapter runs the real Next.js build and supports Next.js 16. |
| Israeli payment gateways | No Medusa v2 provider exists for Cardcom, PayPlus or Tranzila. All three offer a hosted payment page with a server-to-server confirmation. |

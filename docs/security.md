# Security

This document lists the security controls that are in the code today, where each one lives, and how each was checked. It then lists what is missing, and ends with a checklist to go through before a public launch.

**Nothing is deployed.** There is no server, no domain and no Cloudflare configuration yet. Controls that live in the reverse proxy, the containers or Cloudflare are described as prepared or planned, and none of them has been exercised on a real deployment.

This is an engineering description. It does not state that the system complies with any law, regulation or standard. The points that need a lawyer, an accountant or another professional are collected under [Needs professional review](#needs-professional-review).

## Threat model

What is being protected:

- Customers' personal data (names, addresses, phone numbers, order history) and their accounts.
- The admin dashboard. Any admin user can change prices, see every customer and issue refunds.
- The integrity of orders: an order should exist only when the payment provider confirmed the money, for the amount Medusa calculated.
- Site content, secrets and backups.

Who is expected to try:

- Anonymous visitors and bots: password guessing, mass sign-ups, probing for admin routes, scraping.
- A dishonest shopper: changing a price or total, faking the return from the payment page, reading someone else's order.
- Someone holding a stolen or guessed admin password.
- A compromised dependency, or a secret that leaked.

Outside what the application can do by itself: card data, which never reaches this site (see [payments-integration.md](payments-integration.md)); large denial-of-service attacks, which are left to Cloudflare once it is set up; and the security of the Oracle, Cloudflare and GitHub accounts themselves, which is the owner's to protect with strong passwords and two-factor sign-in.

## How to read "Verified"

Each control below says how it was checked, using one of three labels.

| Label | Meaning |
|---|---|
| **Test** | An automated browser test in `e2e/tests` asserts it. The test is named. The suite is run by hand against a local stack; no CI runs it yet. |
| **Checked by hand** | Observed on a running local stack on the date given. |
| **Code only** | The control is in the code and was read there. No automated test asserts it. |

The backend has no automated tests of its own yet. That is why several controls below are "Code only".

## Controls in place

### 1. The admin is separate from the store, and requires sign-in

- Medusa requires an authenticated admin user on every `/admin/*` route and a publishable API key on every `/store/*` route. The custom admin routes are under `apps/backend/src/api/admin/` and inherit that rule; none of them opts out.
- The only custom routes that opt out of Medusa's authentication are the four route files of the simulated payment gateway (`apps/backend/src/api/dev-gateway/`). They check their own shared secret or page token, and they are not registered in production.
- The dashboard is served at `/app` by the API process only. The worker process never serves it (`admin.disable` in `apps/backend/medusa-config.ts`).
- Admin sessions and tokens are signed with `COOKIE_SECRET` and `JWT_SECRET`. Tokens expire after `JWT_EXPIRES_IN` (7 days unless set).
- **Prepared for deployment** (`infrastructure/docker/Caddyfile`): the public API hostname is an allowlist. It passes on `/health`, `/store`, `/auth/customer/*`, `/auth/session`, `/auth/token/refresh`, `/hooks/*`, `/static/*` and `/dev-gateway/pay/*`, and answers 404 to everything else, including `/admin`, `/app` and admin sign-in. The dashboard hostname refuses `/store`, `/hooks` and `/dev-gateway`.

**Verified:** **Test**, `admin-content.spec.ts`, "the dashboard is at /app and requires signing in": an unauthenticated visit to the dashboard lands on `/app/login`, and unauthenticated calls to `/admin/cms/banners` and `/admin/products` answer 401. A call to an admin route with a *customer's* token is not tested, although a comment in that test mentions it. The proxy rules are **Code only**.

### 2. Customer accounts and cookies

- Customer sign-in is Medusa's own email-and-password authentication.
- The token Medusa issues is stored in one place: an httpOnly cookie, `bnz_session`, valid for 7 days. The cart id is in a second httpOnly cookie, `bnz_cart`, valid for 28 days. Both are `SameSite=Lax` and are marked `Secure` in production builds. Page scripts cannot read either.
- `Lax` and not `Strict` is deliberate: the shopper returns from the payment page by a cross-site navigation, and a strict cookie would be withheld on it.
- The browser never talks to the backend. The Medusa SDK runs on the storefront's server only (`import "server-only"`), keeps no token between requests (`jwtTokenStorageMethod: "nostore"`), and is given each visitor's token explicitly. No storefront variable uses the `NEXT_PUBLIC_` prefix, so nothing from the environment is compiled into browser code.
- Every change a visitor makes goes through a Next.js Server Action. Next.js accepts those only as `POST` and compares the request's `Origin` with its `Host`.
- After signing in, a visitor is redirected only to a path on this site (`safeNext`).
- The password-reset form gives the same answer whether or not the address has an account.
- An order in the account area is looked up through the signed-in customer's own order list, so another customer's order id is simply not found.
- A third cookie, `bnz_locale`, remembers the language. It is set by page script, is not httpOnly, and holds nothing but `he`, `en` or `ar`.

**Where:** `apps/storefront/lib/medusa/cookies.ts`, `client.ts`, `customer.ts`, `customer-data.ts`.

**Verified:** **Test**, `account.spec.ts`: registering signs in; the same email cannot register twice; a wrong password is refused; signing out ends the session; password reset by email works and the old password stops working; the reset form answers the same for an unknown address; "one customer cannot open another customer's order" (404). The cookie attributes themselves are **Code only**.

### 3. Rate limiting

Medusa has no rate limiting built in. `apps/backend/src/lib/rate-limit.ts` adds it, and `apps/backend/src/api/middlewares.ts` applies it to these routes:

| Route | Per address | Per email |
|---|---|---|
| `POST /auth/<actor>/emailpass` (sign-in, customers and admin users) | 20 in 5 minutes | 8 in 15 minutes |
| `POST /auth/<actor>/emailpass/register` | 10 an hour | |
| `POST /auth/<actor>/emailpass/reset-password` (ask for a reset link) | 10 an hour | 3 an hour |
| `POST /auth/<actor>/emailpass/update` (set a new password with a reset token) | 10 an hour | |
| `POST /store/customers` | 10 an hour | |
| `POST /store/newsletter` | 5 an hour | |

- A request over a limit gets `429` with a `Retry-After` header.
- Counters are kept in Redis (keys starting `rl:`), so every backend process shares them. If Redis cannot be reached, the limiter keeps counting in memory instead of switching itself off.
- The limits are on when `RATE_LIMIT_ENABLED=true`, and also when the variable is unset and `NODE_ENV=production`. `false` switches them off.

**Whose address is counted.** Shoppers do not call the backend; the storefront's server does, on their behalf. Counted naively, every shopper would share the storefront server's address and one limit. So:

- For calls it makes for a visitor (sign-in, both steps of registration, asking for a reset link, setting a new password, newsletter sign-up), the storefront sends the header `x-storefront-visitor: <time>|<address>|<signature>`. The signature is an HMAC-SHA256 under `REVALIDATE_SECRET`, the secret the two servers already share (`apps/storefront/lib/medusa/visitor.ts`).
- The backend uses that address only if the signature is valid and the header is less than five minutes old. Anything else is ignored, so a caller cannot choose the address it is counted under.
- Otherwise the address is the network peer, unless `TRUST_CLOUDFLARE_IP=true`, in which case it is read from `CF-Connecting-IP`.

Both of these depend on the reverse proxy. The storefront reads the visitor's address from `CF-Connecting-IP`, `X-Forwarded-For` or `X-Real-IP`, and the prepared proxy overwrites all three with the address it established itself. If the storefront or the backend can be reached without passing through the proxy, a caller can set those headers and pick its own address. `TRUST_CLOUDFLARE_IP=true` is safe only under the same condition.

**Verified:** **Test**, `e2e/tests/rate-limit.spec.ts`, which calls the backend the way the storefront does, using the newsletter route: "one visitor reaching the limit does not block another" (five sign-ups pass, the sixth answers 429 with `Retry-After`, a second visitor still passes), and "a visitor address is believed only with a valid, recent signature" (a wrong secret, a ten-minute-old header, a signature with extra characters appended and an extra field are each ignored). The limits on the sign-in, registration and password-reset routes, and the storefront actually sending the header, are **Code only**. The browser suite clears the counters before each run so that its own sign-ins do not trip them.

### 4. Upload validation

Medusa's upload route accepts any file of any size; its only limit is in the browser. `apps/backend/src/lib/uploads.ts` adds server-side checks to `POST /admin/uploads`:

- A request whose declared length is larger than 12 files of 8 MB is refused with 413.
- At most 12 files per request, each at most 8 MB.
- Each file's first bytes are inspected. The file must really be JPEG, PNG, WebP or AVIF, and that must equal the type the browser declared. SVG is not accepted, because an SVG can carry scripts.

`POST /admin/uploads/presigned-urls` (links for uploading straight to storage) is checked for the declared type and size only; the content cannot be inspected on that path.

Uploading requires an admin sign-in in the first place. The prepared proxy also caps request bodies: 100 MB on the upload path, 10 MB on the rest of the dashboard hostname, 2 MB on the storefront and API hostnames.

One point to settle with a test. Medusa's own middleware for this route is registered before the application's and holds uploaded files in memory. If it runs first, as that order suggests, these checks decide what gets stored, not how much the server reads; the proxy's body limit is then what caps the latter. The comment in `uploads.ts` says the size check runs before the body is read. This was not measured.

**Verified:** **Test**, `admin-content.spec.ts`, "a banner created in the admin, with an uploaded image, appears on the storefront", shows that a valid WebP upload is accepted and served. Rejection of an oversized file, a disallowed type or a file whose content does not match its declared type is **Code only**.

### 5. Input validation

- Every custom admin and store route that accepts a body validates it against a schema in `apps/backend/src/api/validators.ts` before the handler runs. The schemas are strict: unknown fields are rejected, and text fields have length limits. The simulated payment gateway's routes validate inside their handlers.
- Link and image addresses entered by staff must be a site-relative path or an `http(s)` URL. This keeps `javascript:` and `data:` URLs out of the storefront's markup.
- Page text is written as Markdown and rendered with raw HTML switched off (`apps/storefront/components/ui/markdown.tsx`).
- The footer map accepts only a Google Maps address; anything else falls back to a map built from the street address (`apps/storefront/lib/site.ts`).
- The storefront's server actions check emails, Israeli phone numbers and postal codes, and quantities, before calling the backend.
- Values placed into emails and into the simulated payment page are HTML-escaped.
- The storefront never sends a price or a total. Medusa calculates them.

**Verified:** **Test**: `admin-content.spec.ts`, "a draft page is not public; a preview link shows it; publishing makes it public" saves a page whose text contains a `<script>` tag and asserts that it does not run. `checkout.spec.ts`, "address validation rejects a bad phone number and postal code". `account.spec.ts` covers a short password and a bad phone number. The storefront unit test `lib/site.test.ts` covers a hostile map address. The backend schemas themselves are **Code only**.

### 6. CORS

`STORE_CORS`, `ADMIN_CORS` and `AUTH_CORS` are comma-separated lists of the origins that browsers may call each part of the API from. They are read in `apps/backend/medusa-config.ts`. In the prepared production stack they default to the storefront origin, the dashboard origin, and both.

CORS restricts browsers only. It is not what keeps the admin API private; authentication is.

**Verified:** **Code only.**

### 7. Signed preview links for unpublished content

- `POST /admin/cms/preview-token`, which requires an admin sign-in, returns a link to the storefront's `/api/preview`. The token in it is `<base64url(JSON)>.<HMAC-SHA256>`, signed with `CMS_PREVIEW_SECRET`, and expires after 30 minutes.
- The storefront checks the signature and the expiry, switches on draft mode, keeps the token in an httpOnly cookie (`bnz_preview`, 30 minutes) and redirects only to a path on this site.
- While previewing, the storefront sends the token to the backend in the `x-cms-preview-token` header. The backend checks it again before it includes drafts and scheduled content. Without a valid token the content routes return published content only.
- The link is a bearer token: anyone who has it can see drafts until it expires. It is not tied to a person or a page, and the only way to cancel one early is to change `CMS_PREVIEW_SECRET`.

**A bug that was found and fixed here.** The first version compared signatures by decoding both as hex. Node's `Buffer.from(value, "hex")` silently stops at the first character that is not hex, so a valid signature with extra characters appended still compared equal. `signaturesMatch` in `apps/backend/src/lib/signing.ts` now requires both values to be exactly 64 hex characters before the constant-time comparison, and `verifySignedToken` requires the token to have exactly two parts. The storefront's check (`apps/storefront/app/api/preview/route.ts`) applies the same 64-character rule.

**Verified:** **Test**, `admin-content.spec.ts`: "a draft page is not public; a preview link shows it; publishing makes it public" (a draft answers 404 on the storefront and on the Store API, the preview link shows it, leaving preview hides it again, a page scheduled for the future answers 404), and "a forged preview link is refused" (a made-up token answers 401). For the preview token itself, the appended-characters case has no test, so that part is **Code only**. The same `signaturesMatch` function is exercised with extra characters appended by `rate-limit.spec.ts` (control 3).

### 8. Cache refresh calls from the backend

When products or content change, the backend calls the storefront's `POST /api/revalidate`. The call carries `Authorization: Bearer <REVALIDATE_SECRET>`; the storefront compares it in constant time and answers 401 otherwise, including when no secret is configured. The body may name any of the five known cache tags, or ask for everything to be refreshed; nothing else is accepted.

The secret is shared, not a signature over the request. In the prepared deployment the proxy refuses `/api/revalidate` from outside altogether, and the backend reaches the storefront over the private network.

The same secret signs the visitor address used for rate limiting (control 3). Someone who obtained it could force pages to be rebuilt and could choose the address their sign-in attempts are counted under. It cannot change content or sign anyone in.

**Where:** `apps/backend/src/lib/revalidate.ts`, `apps/storefront/app/api/revalidate/route.ts`.

**Verified:** **Code only.** The content tests in `admin-content.spec.ts` rely on admin changes appearing on the storefront, which exercises the call indirectly; nothing tests that an unauthenticated call is refused.

### 9. Payment confirmation

The full flow is in [payments-integration.md](payments-integration.md). The security properties:

- The webhook from the payment gateway is signed: HMAC-SHA256 over `<timestamp>.<body>` with a shared secret, a 300-second window, compared in constant time.
- Even a correctly signed webhook is not believed. The provider module fetches the state of the charge from the gateway's API.
- The return page takes nothing from the address as fact. It asks Medusa, and Medusa asks the gateway.
- The gateway's API requires the shared secret, and the payment page requires a random per-charge token.
- The simulated provider cannot be loaded when `APP_ENV=production`.

**Verified:** **Test**, `checkout.spec.ts`: an approved payment creates an order with Medusa's total and a captured payment; a declined and a canceled payment create none and keep the cart; "returning with a forged success address does not create an order". A webhook with a bad signature, an old timestamp or a repeat delivery is **Code only**.

### 10. Security headers

The storefront sends these on every response (`apps/storefront/next.config.ts`), and does not send `X-Powered-By`:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

**Prepared for deployment** (`infrastructure/docker/Caddyfile`): `Strict-Transport-Security: max-age=31536000` on all three hostnames; the first three headers above added to any response that lacks them; `Server` and `X-Powered-By` removed; `X-Robots-Tag: noindex, nofollow` on the API and dashboard hostnames.

There is no `Content-Security-Policy`. See [Known gaps](#known-gaps).

**Verified:** **Checked by hand** on 2026-11-23 against the local development storefront: the four headers were present on `/`, `/products`, `/cart`, `/en/cart` and `/api/cart`, and `X-Powered-By` was absent. The proxy's headers are **Code only**.

### 11. Personal pages are not cached

- Catalog and content pages never read cookies, so one cached copy is the same for everyone. The cart badge and sign-in state are fetched afterwards.
- `next.config.ts` sets `Cache-Control: private, no-store` on `/cart`, `/checkout`, `/account`, `/order` and everything under them. The cart badge endpoint `/api/cart` sets the same header itself.
- Pages that read cookies are rendered per request, and Next.js marks such pages `private, no-cache, no-store` by default. The same applies while content preview is on.
- While indexing is off (`ALLOW_INDEXING=false`, the default), every page carries `noindex` and `robots.txt` disallows everything.

Two caveats, both listed under [Known gaps](#known-gaps): the explicit rule matches the Hebrew addresses only, not `/en/...` and `/ar/...`; and the existing test does not prove anything when run against the development server.

**Verified:** **Test**, `storefront.spec.ts`: "temporary URLs are kept out of search engines". The test "personal pages are never cacheable" checks `/cart`, `/checkout`, `/account/login` and `/api/cart` for `no-store`, but the development server sends `no-store` on every page (**checked by hand** on 2026-11-23: `/` and `/products` had it too), so that test is only meaningful against a production build. It has not been run against one.

### 12. Secrets

- `.env.example` holds placeholders only. Real values are generated on each machine by `pnpm dev:setup`, as random 32-byte values, into files with mode 600.
- `.gitignore` excludes `.env` and `.env.*` (except the example files), `.dev.vars`, private keys (`*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`), `.oci/`, `*.tfvars` (except the example), Terraform state, `restic-password*` and database dumps.
- In the prepared deployment, secrets live in one file on the server (mode 600) and in the owner's password manager. The Compose file names the secrets it requires and refuses to start without them, and passes each container only the variables listed for it.
- The proxy's access log cuts off query strings, because preview links and payment-page links carry tokens there.
- The publishable API key is not a secret.

What changing a secret does: `JWT_SECRET` or `COOKIE_SECRET` signs everyone out. `AUTH_MFA_ENCRYPTION_KEY` invalidates every enrolled two-factor device. `REVALIDATE_SECRET` and `CMS_PREVIEW_SECRET` must be changed on the backend and the storefront together; while they differ, cache refreshes, content preview and per-visitor rate limiting do not work.

**Verified:** **Checked by hand** on 2026-11-23: `git check-ignore` reports `apps/backend/.env` and `apps/storefront/.env.local` as ignored, and the only env file tracked by git is `.env.example`. The repository's history has not been scanned for secrets.

### 13. Two-factor sign-in for admins (MFA)

Medusa's Auth module includes two-factor sign-in with an authenticator app (TOTP) and recovery codes. It needs `AUTH_MFA_ENCRYPTION_KEY`, which encrypts the stored TOTP secrets. `pnpm dev:setup` generates one locally, and the production Compose file refuses to start without one.

**Enrolment has not been exercised end to end on this project.** Nobody has yet enrolled a device, signed in with a code, and used a recovery code against this codebase. Until that is done, treat MFA as available but unproven. Two things to look at when doing it:

- Medusa's notes for the installed version say that sign-in challenges are held in its cache module and checked under a lock from its locking module. This configuration registers Redis-backed locking when `REDIS_URL` is set and does not configure a cache module itself. Confirm that a challenge works in the production layout, where the API runs as its own process.
- Nothing found so far forces an admin to enrol. Whether enrolment can be made mandatory was not checked.

Customers are not offered two-factor sign-in.

**Verified:** **Code only**, and only that the key is wired up.

### 14. A small activity log

Medusa's own audit log is an Enterprise feature (see [Known gaps](#known-gaps)). The custom `activity-log` module records a narrower set of events:

| Recorded | With the acting admin's id |
|---|---|
| Creating, changing, deleting and reordering site content (sections, banners, pages, menus, settings, price list, gallery, team, reviews) | Yes |
| Creating, changing and deleting brands | Yes |
| Admin users created, changed, deleted; invitations created, accepted, deleted; an admin asking for a password reset | No. Medusa's events do not say who caused them. |

An entry holds the action, the record, a short summary and the names of the fields that changed, never their content. Entries are shown in the dashboard under Settings, Activity log, and through `GET /admin/activity-log`. No route changes or deletes them.

**Where:** `apps/backend/src/modules/activity-log/`, `src/workflows/activity-log/`, `src/subscribers/activity-log-accounts.ts`.

**Verified:** **Test**, `admin-content.spec.ts`, "content changes are written to the activity log": entries for a created banner and an updated home page section exist and name an admin user.

### 15. Dependencies and container images

- Medusa is pinned to an exact version and the lockfile is committed.
- `pnpm-workspace.yaml` allows install scripts only for a named list of packages and denies the rest.
- The production Compose file and both Dockerfiles pin their base images by digest.
- **Prepared for deployment** (`infrastructure/docker/compose.prod.yaml`): the application containers run as a non-root user with all Linux capabilities dropped and `no-new-privileges`; PostgreSQL and Redis publish no port and sit on a network with no route to the internet; nothing mounts the Docker socket.

Server-level controls (SSH by key from one address, fail2ban, automatic security updates) are described in [oracle-deployment.md](oracle-deployment.md).

**Verified:** **Code only.**

### 16. Dependency and secret scanning

**Not in place.** The plan is a scheduled GitHub Actions workflow that runs `pnpm audit`, a secret scanner and a container image scanner. `.github/workflows` contained no workflow when this document was written (2026-11-23). Update this section when it does.

## Known gaps

These are real, and none of them is hidden by the controls above.

### No roles or permissions for admin users

Every admin user has full access. Role-based access control, Medusa's own audit log and single sign-on are part of Medusa's Enterprise edition: the `@medusajs/rbac` and `@medusajs/audit` packages are installed with Medusa but carry an Enterprise licence and, by their own notes, load only when a licence covers them. Medusa's pricing page listed all three under the Enterprise plan only when read on 2026-11-23.

What is done instead. These reduce the risk; they do not replace roles.

| Compensation | Status |
|---|---|
| Few admin accounts, one per person, none shared | A rule for the owner to keep |
| Two-factor sign-in for every admin | Available, not yet exercised (control 13) |
| The custom activity log | In place, narrow (control 14) |
| Cloudflare Access in front of the dashboard hostname, as a second sign-in | Planned. Not set up. |

### The activity log is narrow

Changes to products, prices, stock, orders, customers, promotions and store settings are **not** recorded, and neither are sign-ins. Account events carry no actor. The log is in the same database as everything else, so someone with database access can alter it.

### Rate limits cover six routes and lean on the proxy

Cart, promotion-code, search and checkout routes have no limit at all. Per-visitor counting (control 3) is correct only while the storefront and the backend are reachable through the reverse proxy alone, which has not been tested on a deployed stack.

### Nothing at the edge yet

There is no web application firewall, bot protection or edge rate limiting until Cloudflare is in front of the site. Cloudflare's Free plan allows one rate limiting rule; the plan is to use it.

### GitHub Free, private repository

A private repository on GitHub Free has no protected branches or rulesets, so nothing technically stops a direct push to `main`. GitHub Pro would add protected branches and required pull-request reviews for private repositories. Required reviewers on deployment environments are, according to GitHub's documentation read on 2026-11-23, available for public repositories only on the Free, Pro and Team plans.

The intended compensations are that deployments are started by hand by the owner, that workflows triggered by pull requests receive no secrets, that images are deployed by digest, and that the deployment key on the server can run one script only. The workflows do not exist yet, so none of this is in force.

### Addresses can leak to Google through the map

When an address or a map is set in the admin, the footer shows a Google Maps iframe, and the footer is part of every page. The iframe carries `referrerPolicy="no-referrer-when-downgrade"` (`apps/storefront/components/layout/footer.tsx`), so when the map loads, Google is sent the full address of the page it sits on; the attribute takes precedence over the site-wide `Referrer-Policy` header. On two pages the address itself is sensitive: the order confirmation page (the address contains the order id, which is all that protects a guest's order details) and the password-reset page (the address contains the reset token and the email). The password-reset page already declares `no-referrer` for itself, which covers its links and forms, but an attribute on the iframe overrides a page's own policy for that one request. Changing the attribute to `strict-origin-when-cross-origin` or `no-referrer`, or leaving the map out on those pages, closes this. This is read from the code and the browser rules for referrer policy; it has not been observed in a network trace.

### Other third parties

- **Google Maps.** Beyond the point above, any visitor whose browser loads the map makes a request to Google. No Google API key is used.
- **The booking page.** "Book an appointment" opens an external booking service in a new tab, with `rel="noopener noreferrer"`. This site sends it nothing. What that service does with the data people enter there is outside this system.
- **WhatsApp and social links** are plain links.

### Smaller points

| Gap | Detail |
|---|---|
| No `Content-Security-Policy` | Neither the storefront nor the proxy sends one. |
| Cache rule misses two languages | The explicit `private, no-store` rule matches `/cart`, `/checkout`, `/account` and `/order`, not `/en/...` or `/ar/...`. Those pages rely on Next.js's default for per-request pages. Not checked on a production build. |
| Guest order pages | `/order/<id>/confirmed` shows an order to anyone who has the address. The id is long and random; that is the only protection. |
| Signing out | Deletes the cookie. The token itself stays valid until it expires (7 days). |
| Passwords | The 8-character minimum is enforced by the storefront's forms only. There is no check against known-breached passwords. |
| Direct-to-storage uploads | Checked by declared type and size only. |
| Emails and the simulated payment page | Hebrew only. A shopper using the English or Arabic site receives the order confirmation and the password-reset email in Hebrew. |
| No backend tests | Upload rejection, webhook forgery and the limits on the sign-in routes are untested. |
| No scanning, no CI | Control 16. |
| No monitoring of security events | The prepared health watcher checks availability, disk and backup age, not sign-in failures or rejected webhooks. |

## Needs professional review

None of the following has been reviewed, and this document asserts nothing about them.

- **Privacy.** What personal data is collected, how long it is kept, the privacy policy's text, and the obligations of Israeli privacy law for a database of customers. The policy also has to cover the third parties above.
- **Newsletter consent.** The form requires a ticked consent box and the backend refuses a sign-up without it. Whether that wording and record meet anti-spam rules is a legal question.
- **Accessibility.** The accessibility statement page is a placeholder.
- **Terms, cancellations and refunds.** The pages are placeholders.
- **Card payments.** Which PCI DSS obligations remain with the business under a hosted payment page; see [payments-integration.md](payments-integration.md#go-live-checklist).
- **Invoices and VAT.** An accountant's decision.

## Pre-launch security checklist

**Accounts and access**

- [ ] One admin account per person. The seeded development admin (`admin@bonanza.test`) does not exist in production.
- [ ] MFA enrolled and tested for every admin: sign in with a code, then with a recovery code. Record the steps in this document.
- [ ] Cloudflare Access is in front of the dashboard hostname, limited to named people.
- [ ] Two-factor sign-in is on for the Oracle, Cloudflare, GitHub and domain registrar accounts.

**Secrets**

- [ ] Every production secret was generated fresh for production (`openssl rand -hex 32`) and exists only on the server and in the password manager.
- [ ] No development value was reused.
- [ ] The repository's full history has been scanned for secrets.

**Configuration**

- [ ] `APP_ENV=production`, `PAYMENT_DEV_ENABLED=false`, `RATE_LIMIT_ENABLED=true`.
- [ ] `STORE_CORS`, `ADMIN_CORS` and `AUTH_CORS` name the real origins and nothing else.
- [ ] `TRUST_CLOUDFLARE_IP=true` only because the backend is reachable through the proxy alone. Confirm from outside that port 9000 is not.
- [ ] `ALLOW_INDEXING` is `true` only on the real domain.
- [ ] The region has no test payment provider attached; see [payments-integration.md](payments-integration.md#go-live-checklist).

**Checks to run against the deployed stack**

- [ ] On the API hostname, `/admin/products`, `/app` and `/auth/user/emailpass` answer 404.
- [ ] On the dashboard hostname, `/store/products` and `/hooks/payment/x` answer 404.
- [ ] On the storefront hostname, `/api/revalidate` answers 404 from outside.
- [ ] PostgreSQL and Redis are not reachable from outside the server.
- [ ] `/cart`, `/checkout`, `/account` and an order page, in all three languages, answer with `Cache-Control` containing `no-store`, and Cloudflare reports them as not cached.
- [ ] The security headers and `Strict-Transport-Security` are present on all three hostnames.
- [ ] From one browser, the eleventh registration in an hour is refused, while a registration from a different network still succeeds.
- [ ] A request sent to the storefront with a made-up `X-Forwarded-For` header is still counted under the sender's real address.
- [ ] Uploading a text file renamed to `.png`, an SVG, and a file over 8 MB are each refused.
- [ ] The full browser suite passes against a production build.

**Gaps to close or accept in writing**

- [ ] The map's referrer policy.
- [ ] The cache rule for `/en` and `/ar`.
- [ ] A `Content-Security-Policy`.
- [ ] Scanning and CI in place and green.
- [ ] Each item under [Needs professional review](#needs-professional-review) has an owner.

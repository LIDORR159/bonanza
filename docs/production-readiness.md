# Production readiness

**The site is not ready for a public launch, and nothing is deployed.** The software works on a development machine and its checks pass on GitHub. What stands between that and a launch is mostly outside the code: a domain, cloud accounts, a payment provider, an email service, real content, and professional review of the legal texts. This page says what is done, how each claim was checked, and what is left.

Status as of 2026-11-23. Each statement is one of three kinds, and the Evidence column says which:

- **Read from the repository or from GitHub** while writing this page.
- **Reported by the lead engineer** on 2026-11-23: work done on a development machine that left no record this page could re-read.
- **Not verified**, said plainly.

This page does not state that the system complies with any law, regulation or standard.

## Summary

| Status | Meaning |
|---|---|
| **Done and verified** | Built, and checked by a test or a recorded observation. |
| **Done, not verified** | Built or written, and not yet exercised for real. |
| **Not started** | Nothing exists. |
| **Blocked on the owner** | Cannot move until the owner decides, signs in, pays or supplies something. |

### The application

| Area | Status | Evidence |
|---|---|---|
| Lint, type checks, builds | Done and verified | `pnpm lint`, `pnpm typecheck` and `pnpm build` pass locally (lead engineer). The CI workflow runs the same commands and passed on three pushes (GitHub). |
| Unit tests | Done and verified | `pnpm test`: 25 storefront tests (Vitest) and 24 backend tests (Jest), all passing (lead engineer). Also run by CI. |
| Store: catalog, search, filters, product pages, cart, discount code, checkout, customer accounts | Done and verified, with demo products and simulated payment | Browser suite: `catalog.spec.ts`, `checkout.spec.ts`, `account.spec.ts`. |
| Barbershop pages: hero, story, price list, gallery, team, reviews, contact, floating buttons, accessibility menu | Done and verified, with mostly sample content | `barbershop.spec.ts`, `storefront.spec.ts`. |
| Admin content management: sections, price list, gallery, settings, banners, pages, drafts, preview links, uploads, activity log | Done and verified | `admin-content.spec.ts`, `admin-barbershop.spec.ts`. |
| Three languages: addresses, direction, translated content with Hebrew as the fallback | Done and verified as a mechanism. **The English and Arabic wording is a first draft.** | `barbershop.spec.ts`, "languages". |
| Simulated payment: approved, declined, canceled, forged return | Done and verified | `checkout.spec.ts`. |
| A real payment provider | Blocked on the owner | None chosen. [payments-integration.md](payments-integration.md#choosing-a-real-provider). |
| Email: order confirmation and password reset | Done and verified against a mail catcher. Hebrew only. | `checkout.spec.ts` waits for the order email and `account.spec.ts` for the password-reset email. Both were re-tested after the email library was upgraded (lead engineer). No email has ever been sent to a real inbox. |
| Sending email in production | Blocked on the owner | No service chosen. |
| Access control: admin routes refuse anonymous callers and customer tokens; one customer cannot open another's order | Done and verified | `admin-content.spec.ts`, `admin-barbershop.spec.ts`, `account.spec.ts`. |
| Rate limits, counted per visitor | Done and verified for the newsletter route. The limits on sign-in, registration and password reset are in the code and not tested. | `rate-limit.spec.ts`; [security.md](security.md#3-rate-limiting). |
| Two-factor sign-in for admins | Done and verified through the API | `e2e/tests/mfa.spec.ts`. Not tested: the dashboard's own enrolment screens, recovery codes, and the production layout. |
| Personal pages are never cacheable | Done and verified on a production build | `storefront.spec.ts`, run against `next build` and `next start` (lead engineer; [security.md](security.md#11-personal-pages-are-not-cached)). |
| Other security controls | Done; verification varies control by control | [security.md](security.md#controls-in-place) labels each one Test, Checked by hand or Code only. |
| Accessibility features: skip link, accessibility menu, image descriptions | Done, not verified | Two browser tests cover the skip link and the menu. No accessibility audit has been carried out, and the accessibility statement page is a placeholder. |
| Performance | Not verified | No load test or page-speed measurement is recorded in the repository. |

### The browser suite as a whole

| Where it ran | Result | Evidence |
|---|---|---|
| Development servers, locally | 96 passed, 3 skipped | Lead engineer |
| A production build of the storefront (`next build`, `next start`, with `IMAGES_ALLOW_LOCAL=true`), locally | 96 passed, 3 skipped | Lead engineer |
| Two specs added after those runs: `admin-barbershop.spec.ts` (7 tests) and `mfa.spec.ts` (1 test) | Pass against the development stack. **Not yet run against a production build.** | Lead engineer |
| GitHub, E2E workflow, commit `862eb34` | 106 tests: 103 passed, 3 skipped, none retried, in 11 minutes 23 seconds. This run includes `admin-barbershop.spec.ts` and predates `mfa.spec.ts`. | GitHub |
| GitHub, E2E workflow, commit `372a77f` (the first to include `mfa.spec.ts`) | 107 tests: 104 passed, 3 skipped, none retried. This is the whole suite as it stands, in one run, against the development servers. | GitHub |

The 3 skipped tests are skipped by design: two are phone-only checks that skip on the desktop project, and one is a keyboard check that skips on the phone project.

### Infrastructure and operations

| Area | Status | Evidence |
|---|---|---|
| Container images and the Compose stack | Done, not verified for the current commit | Validated locally on an earlier commit; re-validation of the current commit was in progress when this was written. The record, and its result when it lands, is in [infrastructure/docker/README.md](../infrastructure/docker/README.md#validation-record). |
| Reverse proxy rules: hostnames, refused paths, headers, body limits, visitor address | Done and verified on that earlier commit | Same record. |
| `deploy.sh`, including its automatic return to the previous version | Done and verified on that earlier commit | Same record. |
| `rollback.sh`, `backup.sh`, `restore.sh`, `restore-verify.sh` | Done, not verified | Never run against the stack or against real object storage. |
| Health watcher and alerts | Done, not verified | `healthwatch.sh` reported a healthy stack in the same validation. No alert destination and no outside uptime check have been chosen. |
| Oracle Cloud: Terraform, first-boot script, discovery script | Done, not verified | `terraform validate` only. The discovery script has not been run against a tenancy and the first-boot script has never booted a machine. |
| Oracle Cloud: the server itself | Blocked on the owner | Nothing created. [oracle-deployment.md](oracle-deployment.md#4-approval-gate). |
| Cloudflare: DNS, CDN, media and backup buckets, tunnel, Access, rate-limiting rule | Not started, and blocked on the owner | Nothing created. [cloudflare-deployment.md](cloudflare-deployment.md). |
| Storefront on Cloudflare Workers (optional) | Done and verified as a local build and preview only | `cf:build` completed and the local preview served pages (lead engineer). Never deployed; no real bucket or database; performance under the real CPU limit unmeasured. |
| GitHub Actions: CI, E2E, Security | Done and verified | CI passed three times. E2E passed twice in full. Security failed once on a real finding and passed after the fix (GitHub). [github-actions.md](github-actions.md#status-on-2026-11-23). |
| GitHub Actions: Images, and the two inert deploy workflows | Done, not verified | Never run. |
| Deploying from GitHub to the server | Not started | Undecided. [github-actions.md](github-actions.md#the-open-deployment-question). |
| A deployment of any kind | Not started | No server, no domain. |

### Content and business

| Area | Status | Evidence |
|---|---|---|
| Domain | Blocked on the owner | `bonanza.co.il` is registered by someone else ([discovery.md](discovery.md#domain)). |
| Real content supplied so far | Done | The booking link, the address, the story text, and the hero and shop-front photographs. |
| Everything else shown locally | Blocked on the owner | Sample data, marked as such: prices, gallery pictures, team members, reviews, phone number, opening hours, Google rating, products. [cms-management.md](cms-management.md#before-launch-sample-content-to-replace). |
| English and Arabic texts | Blocked on the owner | First drafts awaiting review. |
| Policy pages, VAT set-up, accessibility statement | Blocked on the owner | Placeholders. They need professional review ([security.md](security.md#needs-professional-review)). |
| Documentation | Done | Twelve documents under `docs/`. Statements known to lag the code are listed [below](#statements-in-other-documents-that-lag-the-code). |

## Definition of done

The original brief's list of twenty items was not found in `docs/discovery.md` or in the project plan, so this checklist is built from the plan's milestones M0 to M10 and their "done when" conditions instead. If the brief's own list turns up, it should replace this section.

| # | Milestone | Done when (from the plan) | Met? |
|---|---|---|---|
| M0 | Repository, `discovery.md`, `architecture.md` | A private repository exists, first push | **Met, with a change.** The repository exists and both documents are in it. It was made public on 2026-11-23 at the owner's request. |
| M1 | Monorepo, `compose.yaml`, `.env.example`, base CI | `pnpm install`, `docker compose up`, CI green | **Met.** CI is green on GitHub. The E2E workflow also runs `pnpm dev:setup`, which starts the Compose services, on every run. |
| M2 | Medusa configuration, migrations, admin user, seed | Admin sign-in works at `/app`, `/health` answers, the Store API returns products in ILS | **Met.** Browser tests sign in to the admin and read shekel prices; the E2E workflow waits for `/health`. |
| M3 | Design system, home, catalog and product pages | Screenshots compared against the three reference images, desktop and mobile | **Partly.** The pages exist and are tested for layout faults (sideways scrolling, broken images). Seven screenshots are in `docs/screenshots`. The repository holds no record of the comparison with the references. |
| M4 | Content management, brands, admin screens, storefront wiring | A banner created in the admin appears on the storefront; drafts answer 404 | **Met.** Both are browser tests by those descriptions. |
| M5 | Cart, checkout, simulated payment, accounts, emails | Guest and customer orders persist; declined and canceled payments work | **Met**, with simulated payments only. |
| M6 | Security hardening, activity log, two-factor check | Rate-limit, upload and sign-in tests pass; gitleaks clean | **Met, with gaps named.** Those tests pass and gitleaks found nothing in the full history. Rejection of a bad upload by the running server is covered by a unit test of the check, not by a request. Recovery codes are untested. |
| M7 | Dockerfiles, production Compose, proxy, ops scripts, Terraform, Workers configuration | The production stack is healthy locally on ARM64; a backup has been restored and verified; the Workers preview serves pages | **Two of three.** The stack was healthy on an earlier commit, with re-validation in progress. The Workers preview served pages. **No backup has been taken or restored.** |
| M8 | The remaining workflows | All workflows green on GitHub | **Not met.** Three of six have run and are green. Images and the two inert workflows have never run. |
| M9 | A full pass of the browser suite, defects fixed | Suite green | **Met.** See [The browser suite as a whole](#the-browser-suite-as-a-whole) for which runs covered which tests. |
| M10 | The remaining documents and this report | Twelve documents match the implementation | **Met, with exceptions listed.** Twelve documents exist. [Some statements lag the code](#statements-in-other-documents-that-lag-the-code). |

The plan also set four approval gates: creating anything at Oracle; creating anything at Cloudflare; anything public or DNS-related; and any charge at all. **None of the four has been passed.** Making the repository public was a separate decision the owner has already taken.

## Blockers only the owner can clear

Nothing in the code can substitute for these. They are in rough order of how long each tends to take.

| Blocker | What is needed | What it unblocks |
|---|---|---|
| **Domain** | Acquire a domain. `bonanza.co.il` belongs to someone else. | Cloudflare, the tunnel, real hostnames, email sending, indexing by search engines. |
| **Payment provider** | Choose one and sign with it, including how invoices will be issued. Then a provider module has to be written and tested; none exists for the Israeli gateways. | Taking money. This is development work as well as a decision; see [payments-integration.md](payments-integration.md#adding-a-provider-to-this-repository). |
| **Legal and professional review** | A lawyer for the privacy policy, terms, returns policy and the accessibility statement; an accountant for VAT set-up and invoices. | Publishing those pages. Every one of them is a placeholder today. |
| **Real business content** | Prices and services, photographs of real work, the team and their Instagram profiles, real reviews or none, phone, WhatsApp, opening hours, the Google rating, real products with photographs, prices and stock, real shipping prices. | A site that says true things. |
| **The hero photograph** | A higher-resolution original, with its licence confirmed. The one supplied is 480×320 pixels (`photos-examples/hero-img.jpg`); the site shows a 1440×960 version that appears to be an enlargement of it. The owner has not confirmed its licence. | The first thing every visitor sees. |
| **English and Arabic** | Review every text in both languages: the interface and the content. | Offering those languages publicly. |
| **Oracle Cloud** | Sign in from the command line, so the discovery script can report the home region, what already exists in the account and whether the free allowance has room. Then approve the resource list. Whether Oracle has free capacity at that moment is outside anyone's control. | The server. |
| **Cloudflare** | An account, the domain added to it, and a payment method on file for R2 and Zero Trust. | Media storage, backups, the tunnel, Access. |
| **Email sending** | Choose an SMTP service. | Order confirmations and password resets reaching real inboxes. |
| **What a public repository contains** | Decide whether these may stay public: the three design reference images in `photos-examples/`, which [discovery.md](discovery.md#design-references) records as a third party's; and the hero photograph, whose licence is unconfirmed. Deleting a file does not remove it from a repository's history. | Nothing technical. It is a decision that should be taken knowingly. |
| **GitHub protections** | Decide whether to add a protection rule on `main` and a deployment environment with a required reviewer, both now available at no cost. | A second check before anything is deployed. |
| **Admin accounts** | One account per person, each with two-factor sign-in enrolled. | The dashboard being safe to put on the internet. |

## Known gaps

Security gaps are listed in [security.md](security.md#known-gaps) and are not repeated here. The largest are that every admin user has full access because roles are a paid Medusa feature, that the activity log is narrow, and that there is no Content-Security-Policy.

Gaps recorded elsewhere:

| Gap | Where |
|---|---|
| Settings and switches in the admin that the storefront does not use | [cms-management.md](cms-management.md#known-limits-of-the-content-screens) |
| How a storefront on Workers and the backend would reach each other | [cloudflare-deployment.md](cloudflare-deployment.md#what-has-been-verified-and-what-has-not) |
| How GitHub reaches the server to deploy | [github-actions.md](github-actions.md#the-open-deployment-question) |
| One server, one disk, no standby; the watcher runs on the machine it watches | [oracle-deployment.md](oracle-deployment.md#risks-and-what-to-do-about-them) |
| Emails and the simulated payment page are in Hebrew only; search matches Hebrew titles in every language | [architecture.md](architecture.md#languages) |

Gaps not recorded anywhere else:

- **Oracle may reclaim an idle free instance**, and this store may look idle. Oracle's rule needs CPU, network and memory all below 20% for seven days. The one measurement so far, a single local sample, put all the containers together at about 610 MB shortly after start, roughly 5% of the server's 12 GB. How Oracle's own memory figure would read on the real machine is not known. Watch it in the first weeks.
- **No container image has been scanned for vulnerabilities**, because none has been published.
- **The audit lists moderate advisories** in production dependencies that do not fail the Security run. The first run counted 16; they have not been reviewed.
- **There is no monitoring of what the application does**: failed sign-ins, rejected payment notifications, errors. The health watcher checks that containers are up, disk space and backup age.

### Statements in other documents that lag the code

Found by reading on 2026-11-23. None changes what the system does; each could mislead a reader.

| Document | Statement | What is true |
|---|---|---|
| `architecture.md` | `vinext check` runs in CI as a non-blocking signal | It does not. `vinext` is not a dependency and no workflow runs it. |
| `cost-estimate.md` | No workflow file exists; the repository is meant to be private | Six workflows exist and three have run. The repository is public. |
| `security.md` | "No CI runs it yet"; the workflows "do not exist yet"; the section "GitHub Free, private repository"; the rows "No backend tests" and "No scanning, no CI"; one remaining sentence saying the `no-store` rule covers Hebrew addresses only | CI, E2E and Security run on GitHub. The backend has unit tests. The rule covers `/en` and `/ar`. |
| `discovery.md` | The repository is private | It is public. |
| `infrastructure/docker/README.md`, "Seen during validation" | The storefront passes no visitor address to the backend | Fixed since: the storefront sends a signed visitor address, and a browser test covers it. |
| Comments at the top of `ci.yml`, `e2e.yml`, `images.yml` | The repository is private and its allowance of minutes is limited | Public; standard runners are free. |

## What must be re-verified before launch

Passing once on a development machine is not passing on the server. Each of these has to be done again, or for the first time, against the thing that will actually run.

**Before any deployment**

- [ ] Both images are built from the commit to be deployed, with the real media hostname and storefront address as build arguments, and the stack built from them passes the checks in [the Docker README](../infrastructure/docker/README.md#validation-record). The exact commands are in that file.
- [ ] `seed-content.js` runs inside the backend image and uploads the two home page photographs. The line that copies them into the image was added after the first validation.
- [ ] The whole browser suite, including the two specs added last, passes against a production build of that commit.
- [ ] CI, E2E and Security are green on GitHub for that commit.

**On the server, before it is public**

- [ ] `terraform plan` shows exactly the resources in [oracle-deployment.md](oracle-deployment.md#5-create-the-resources-with-terraform), and the first-boot checks in step 6 pass.
- [ ] `cloudflared` connects, and an admin can sign in through Cloudflare. Neither has ever been tried.
- [ ] An image uploaded in the admin lands in the real media bucket and displays on the storefront.
- [ ] `backup.sh` takes a backup to the real bucket and `restore-verify.sh` restores it. Then the disaster recovery procedure in [backup-and-restore.md](backup-and-restore.md#disaster-recovery-after-losing-the-vm) is rehearsed once, and timed.
- [ ] `rollback.sh` is run once on purpose. It has never been run.
- [ ] A test alert from `healthwatch.sh` reaches a person.
- [ ] Every item under "Checks to run against the deployed stack" in [security.md](security.md#pre-launch-security-checklist).
- [ ] Each admin enrols two-factor sign-in through the dashboard, and one recovery code is tried.
- [ ] An order email and a password-reset email arrive in a real inbox, sent through the real service.

**Before taking money**

- [ ] The go-live checklist in [payments-integration.md](payments-integration.md#go-live-checklist).
- [ ] The sample content checklist in [cms-management.md](cms-management.md#before-launch-sample-content-to-replace).

## Suggested order of steps to a first public deployment

This is a suggestion, not a commitment. Costs are in [cost-estimate.md](cost-estimate.md); "expected $0" means inside a free allowance that the vendor can change. Every step marked **Yes** under Approval is one of the gates in [cost-estimate.md](cost-estimate.md#actions-that-would-start-costing-money) and must not be taken without the owner's explicit yes.

| # | Step | Costs money | Approval |
|---|---|---|---|
| 1 | Decide what a public repository may contain (reference images, the hero photograph), and whether to add a protection rule on `main` | No | Owner's decision |
| 2 | Supply real content and review the English and Arabic texts. Can run in parallel with everything below. | No | Owner's work |
| 3 | Choose a payment provider and the invoice arrangement; choose an email service; start the legal and accounting review | **Yes**: contracts and professional fees | **Yes** |
| 4 | Write and test the payment provider module against the provider's test environment | Development time | No |
| 5 | Acquire the domain | **Yes** | **Yes** |
| 6 | Finish re-validating the container stack locally from the current commit | No | No |
| 7 | Oracle: sign in, run the discovery script (it only reads), review the resource list | No | Sign-in by the owner |
| 8 | Oracle: create the server with Terraform | Expected $0 | **Yes** |
| 9 | Optional, before the domain is ready: try the stack in `direct` mode on a temporary hostname. This opens ports 80 and 443 on the server to the internet. | Expected $0 | **Yes**: it makes the server reachable |
| 10 | Cloudflare: account, zone, nameservers, R2, the two buckets, Zero Trust, the tunnel, Access, the rate-limiting rule, in the order given in [cloudflare-deployment.md](cloudflare-deployment.md#steps-to-go-live-later) | Expected $0. Puts a payment method on file. | **Yes**, each one |
| 11 | Run the Images workflow with the real media hostname and storefront address | No | Owner starts it |
| 12 | First deployment by hand: `deploy.sh`, the publishable key, the first admin user, the starter content ([oracle-deployment.md](oracle-deployment.md#first-deployment)) | No | **Yes**: a production deployment |
| 13 | First backup and restore check; alert test; rollback rehearsal | Expected $0 | No |
| 14 | Two-factor sign-in for every admin; enter the real content; connect the email service and the payment provider | Provider fees begin | Covered by step 3 |
| 15 | Run every check under [What must be re-verified before launch](#what-must-be-re-verified-before-launch) | No | No |
| 16 | Publish the reviewed policy pages; set `ALLOW_INDEXING=true` on the real domain | No | **Yes**: this is the public launch |
| 17 | Decide how GitHub deploys to the server, or keep deploying by hand | No | Owner's decision |

Steps 2 to 5 depend on other people and take the longest. Starting them first costs nothing in engineering time, and nothing below step 9 can be finished without them.

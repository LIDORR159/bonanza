# Cost estimate

This document lists every service the design uses, what each one gives for free, how much of that this project expects to use, and what would cause a charge.

**Current spend is zero, because nothing has been provisioned.** This project has created no Oracle Cloud resource, no Cloudflare resource, no domain registration and no paid plan anywhere. There is no Terraform state in `infrastructure/oracle/terraform`, and no workflow file in `.github/workflows` to consume build minutes.

**A zero-cost estimate does not guarantee the absence of charges.** Free allowances are set by the vendors and change. They are counted per account, not per project, so anything else in the same account uses the same allowance. Several of these services bill automatically once a payment method is on file. The guardrails described below make a surprise less likely; they do not make it impossible.

**Every action that could start a charge needs the owner's explicit approval first.** They are listed in [Actions that would start costing money](#actions-that-would-start-costing-money).

This document can only describe what this project creates. It cannot see what else exists in the owner's Oracle, Cloudflare or GitHub accounts.

Limits and prices were taken from `discovery.md` and the project plan, which were checked on 2026-11-23, and were read again on the vendors' own pages on the same day. The pages are listed under [Sources](#sources).

## The estimate at a glance

| | Per month |
|---|---|
| Today | **$0.** Nothing exists. |
| The planned setup, inside every allowance below | **$0** for hosting. In addition: a domain (yearly, not yet priced), a payment provider's fees (not yet chosen), and possibly an email service (not yet chosen). |
| The same, with the storefront moved to Cloudflare Workers | **$5** more, for Workers Paid. |

## Every service in the design

| Service | Free allowance | What this project expects to use | What would trigger a charge |
|---|---|---|---|
| **Oracle Cloud: compute** | The first 1,500 OCPU-hours and 9,000 GB-hours a month of `VM.Standard.A1.Flex`. Oracle states this as 2 OCPUs and 12 GB of memory. Home region only. | One VM of 2 OCPUs and 12 GB, running all month. That is the whole allowance: in a 31-day month, 1,488 OCPU-hours and 8,928 GB-hours. | A second A1 instance. More than 2 OCPUs or 12 GB in total. Any other shape. Anything outside the home region. |
| **Oracle Cloud: storage** | 200 GB of boot and block volumes in total, and 5 volume backups. | One 100 GB boot volume. No block volumes, no volume backups. | More than 200 GB in total. A performance level above Balanced. A sixth volume backup. |
| **Oracle Cloud: network** | 10 TB of outbound data a month. The network resources have no price-list item. | One VCN, subnet, gateway and security group. One ephemeral public IPv4 address. Little outbound data: visitors are served through Cloudflare. | More than 10 TB out. A reserved IP address, a load balancer, or anything else not in [oracle-deployment.md](oracle-deployment.md#what-would-be-created). The public IP is expected to be free; that was not verified against current pricing. |
| **Cloudflare Free plan** | DNS, CDN, TLS certificates and DDoS protection at $0. Five custom firewall rules and one rate limiting rule. | The storefront, API and dashboard hostnames. One rate limiting rule. | Moving to a paid plan, or switching on a paid add-on. |
| **Cloudflare Tunnel** | No separate price was found for it. The Zero Trust Free plan lists "Application Connector Software" as included, which is taken here to mean the tunnel client. | One tunnel carrying three hostnames to the VM. | None known. Confirm on the plan page when signing up. |
| **Cloudflare Access** | The Zero Trust Free plan: $0 for up to 50 users. | A sign-in in front of the dashboard hostname for two or three people. | More than 50 users: $7 per user per month. Signing up asks for payment details even on the Free plan. |
| **Cloudflare R2** | Per month, for the whole account: 10 GB of Standard storage, 1 million Class A (write and list) operations, 10 million Class B (read) operations. Data transfer out is free. | A public bucket for product and content images. A private bucket for encrypted backups. A third bucket for cached pages only if the storefront moves to Workers. | More than 10 GB stored: $0.015 per GB per month. More operations: $4.50 per million Class A, $0.36 per million Class B. The Infrequent Access storage class has no free allowance. R2 must be added to the account through a checkout step first. |
| **Cloudflare Workers** (optional storefront host) | Free: 100,000 requests a day and 10 ms of CPU per request. Requests for static files are free. | Nothing. The Workers build exists and is not deployed. | Subscribing to Workers Paid: a minimum of $5 a month per account, including 10 million requests and 30 million CPU-milliseconds. |
| **Cloudflare D1** (only with Workers) | On the Workers Free plan: 5 million rows read and 100,000 rows written a day, 5 GB. | Nothing unless the storefront moves to Workers, where it holds cache tags. | On the Free plan, queries fail when a daily limit is reached; there is no charge. On Workers Paid, usage beyond the included amounts is billed. |
| **GitHub Free**, private repository: Actions | $12 of included compute a month. At $0.006 a minute for a standard Linux runner that is 2,000 minutes. Linux ARM64 runners are $0.005 a minute. 500 MB of artifact storage. | Lint, type checks, tests and builds on pushes and pull requests. Image builds started by hand. Not measured: no workflow exists yet. | A payment method on the account **and** usage beyond the included amount. Without a payment method, GitHub blocks further usage instead of billing. |
| **GitHub Free**: Packages | 500 MB of storage and 1 GB of data transfer a month for private packages. GitHub states that container image storage and bandwidth for its Container registry are currently free, and promises at least one month's notice before that changes. | Two container images per release: backend and storefront. | A change to the Container registry policy, combined with a payment method on the account. |
| **Domain name** | None. | One `.co.il` domain. | Buying it. **Not purchased.** `bonanza.co.il` is registered by someone else. |
| **Email sending** | Not chosen. | Order confirmations and password resets: a low volume. | Depends on the service chosen. |
| **Payment provider** | Not chosen. | Every online sale. | Signing a contract. Fees are not known. |
| **Let's Encrypt certificates** | Free. | Only in `direct` ingress mode, for testing before the domain is on Cloudflare. | None. |
| **Google Maps** in the footer | The keyless embed is used. No Google Cloud account or API key is involved. | One embedded map. | Switching to a Google Maps API that needs a key and a billing account. |

## Oracle Cloud

The VM, its disk and its network are designed to fit exactly inside Oracle's Always Free allowance. The details, the resource list and the approval step are in [oracle-deployment.md](oracle-deployment.md#4-approval-gate). The points that matter for cost:

**The allowance is fully used.** One VM of 2 OCPUs and 12 GB is all of the A1 allowance. There is no room for a second instance of any size, including a temporary one for a test or a migration.

**It applies in the home region only**, and the home region is fixed when the Oracle account is created.

**Capacity is not guaranteed.** Oracle can refuse to create an Always Free instance with "Out of host capacity". Oracle's guidance is to try another availability domain or try again later. [oracle-deployment.md](oracle-deployment.md#out-of-host-capacity) names upgrading the account to Pay As You Go as the other remedy. That is the owner's decision: from then on, anything above the free amounts is billed automatically.

**An idle instance can be reclaimed.** Oracle treats an Always Free instance as idle when, over 7 days, CPU use (95th percentile), network use and memory use are all below 20%, and may take it back. That is an outage, not a charge. Whether this store's memory use stays above 20% of 12 GB has not been measured.

**Why the Terraform includes a quota policy and a budget alert.** The cost risk is not the planned VM; it is anything created later by mistake, in a tenancy where billing is automatic.

| Guardrail | What it does | Limits |
|---|---|---|
| Quota policy (`manage_quotas`, on by default) | Oracle refuses any request, from any user or tool, that would take the tenancy above 2 A1 OCPUs, 12 GB of A1 memory, 200 GB of block storage or 5 volume backups. | A hard cap, for those four things only. It does not cover other Oracle services. |
| Budget alert (`budget_alert_email`) | A budget of 1 unit of the billing currency a month, with an email when actual spend passes 0.01 and when the forecast reaches the budget. | A warning only. Oracle evaluates budgets about once a day, and a budget stops nothing. Created only if an email address is given. |
| Checks in the Terraform itself | More than 2 OCPUs, more than 12 GB, a boot volume outside 50 to 200 GB, or a region that is not the home region is rejected before anything is sent to Oracle. The shape cannot be changed. | Applies to this Terraform configuration only. |

Both the quota policy and the budget need tenancy-administrator rights.

## Cloudflare

**The Free plan** covers DNS, the CDN and TLS. It requires the domain's nameservers to point at Cloudflare. `.co.il` domains cannot be registered through Cloudflare, so the domain stays with an Israeli registrar.

**R2 is the one Cloudflare service here with a meter.** The 10 GB is the total across all buckets in the account. Two things use it:

- *Images.* Product and content images, as uploaded. Each upload is limited to 8 MB.
- *Backups.* Up to 7 daily, 4 weekly and 6 monthly snapshots are kept, and each database dump is stored almost in full ([backup-and-restore.md](backup-and-restore.md#retention)). The backup bucket therefore holds roughly 17 times the size of one compressed dump. With no images at all, 10 GB is reached when one dump is about 590 MB.

Check the bucket sizes in the Cloudflare dashboard after the first month, and again whenever the catalog grows a lot. The number of operations (one backup a day, a weekly check, image uploads) is expected to be far below the free amounts; that has not been measured.

R2 has to be added to the Cloudflare account through a checkout step before a bucket can be created, even to use only the free amounts. Once it is added, usage beyond the free amounts is billed without further confirmation. Adding it is therefore an approval gate.

**Access** is free for up to 50 users, and this project needs a handful. Cloudflare's own setup guide says that choosing the Free plan still requires entering payment details, and that no charge is made.

**Workers: why the storefront does not run there by default.** The owner's first preference was to host the storefront on Cloudflare Workers. The Free plan allows 10 ms of CPU per request. Cloudflare's documentation says that workloads which do server-side rendering typically use 10 to 20 ms, and that a request over the limit fails with error 1102. A store whose pages fail intermittently is not acceptable, so the default storefront host is a container on the Oracle VM, behind Cloudflare's CDN, at $0.

The Workers build is kept working (`pnpm --filter @bonanza/storefront cf:build`) so that moving later is a configuration change. Moving means Workers Paid, at a minimum of $5 a month, plus an R2 bucket and a D1 database that count against their own allowances. It is an optional upgrade and the owner's call.

The Cloudflare Images binding is deliberately left out of `apps/storefront/wrangler.jsonc`, because it is billed beyond a small allowance.

## GitHub

The repository is meant to be private on GitHub Free.

**Actions.** GitHub now states the included amount as money ($12 a month) and not as minutes; at the standard Linux rate that is the 2,000 minutes its pricing page shows. Building two ARM64 container images is the most expensive job this project has. That is why image builds are planned to be started by hand and not on every push: routine pushes then spend minutes on checks only. No workflow exists yet, so there is no measurement of how many minutes a month the checks will use.

**Packages.** The container images go to GitHub's Container registry. GitHub says storage and bandwidth for that registry are currently free. If that changes, the private-package allowance of 500 MB would be too small for two images, and old images would need to be deleted or the registry changed.

**The safety net is not having a payment method on the GitHub account.** GitHub's documentation says that without one, usage is blocked once the included amount is used up. With one, extra usage is billed.

## Not free, and not yet decided

| Item | Status | What is known about the cost |
|---|---|---|
| Domain | Not purchased. `bonanza.co.il` belongs to someone else; `discovery.md` records the details. | A yearly fee at an Israeli registrar for a new name, or a negotiated price for one that is already taken. No price has been obtained. |
| Payment provider | Not chosen. | Typically a set-up fee, a monthly fee and a commission per transaction, with the card companies' own fees on top. No quote has been obtained. An invoice service may be a separate charge. See [payments-integration.md](payments-integration.md#choosing-a-real-provider). |
| Email sending | Not chosen. Locally, emails are caught by Mailpit and cost nothing. | Any SMTP service works. None has been evaluated. |
| Alert destination and outside uptime check | Not chosen. | The health watcher sends alerts to a webhook address, and [oracle-deployment.md](oracle-deployment.md#the-watcher-runs-on-the-machine-it-watches) recommends an uptime check from outside. Neither has been evaluated. |
| The booking page | An external service the business already uses. | Outside this project. |

## Optional upgrades

None of these is needed for the planned setup. Each is a paid decision for the owner.

| Upgrade | What it would add | Price |
|---|---|---|
| Cloudflare Workers Paid | Running the storefront on Workers without the 10 ms CPU limit | From $5 a month per account |
| GitHub Pro | Protected branches and required pull-request reviews in a private repository; $18 of included Actions compute; 2 GB of package storage | Not shown on GitHub's pricing page when read. Confirm on github.com. |
| GitHub Team | Repository rules in private repositories | $4 per user per month |
| Medusa Enterprise licence | Roles and permissions for admin users, Medusa's own audit log, single sign-on. See [security.md](security.md#no-roles-or-permissions-for-admin-users). | Custom. Medusa's pricing page says to contact sales. |
| Oracle Pay As You Go | A way around "Out of host capacity" | No fee for the upgrade itself according to [oracle-deployment.md](oracle-deployment.md#out-of-host-capacity), but everything above the free amounts is then billed automatically. |

## Actions that would start costing money

Each of these needs the owner's explicit approval before it is done. The first four are also the approval gates in the project plan.

1. **Creating anything at Oracle.** The planned resources are expected to cost $0. Approval is still required, after the discovery script has run and the resource list has been read. Upgrading the tenancy to Pay As You Go, removing the quota policy, or creating any resource that is not in the approved list, needs its own approval.
2. **Adding R2 to the Cloudflare account, creating a bucket, creating a Tunnel, or deploying a Worker**, including a preview on a `workers.dev` address. `pnpm --filter @bonanza/storefront cf:deploy` deploys a Worker.
3. **Anything public or DNS-related**: opening the VM to the internet, changing nameservers, a production deployment.
4. **Any charge at all**, including Workers Paid and GitHub Pro.
5. **Completing Cloudflare Zero Trust sign-up**, because it asks for payment details.
6. **Buying a domain.**
7. **Adding a payment method to the GitHub account**, which turns "blocked at the limit" into "billed beyond the limit".
8. **Signing with a payment provider or an email service.**
9. **Buying a Medusa Enterprise licence.**
10. **Switching on any paid Cloudflare add-on**, such as the Images binding.

## Noticing a charge early

- **Oracle:** give an address for the budget alerts when creating the resources. Look at Billing, Cost Analysis a few days after the VM is created, and again after the first invoice. Run `./infrastructure/oracle/oci-discovery.sh DEFAULT` now and then: it lists every instance, volume and public IP in the tenancy.
- **Cloudflare:** look at the R2 bucket sizes and the account's billing page monthly.
- **GitHub:** keep the account without a payment method unless a paid plan is chosen on purpose.

## Sources

Read on 2026-11-23. Check them again before relying on a number; vendors change these pages without notice.

| Topic | Page |
|---|---|
| Oracle Always Free: A1 allowance, block storage, idle reclamation, capacity, home region, outbound data | `https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm` |
| Cloudflare Workers plans and prices | `https://developers.cloudflare.com/workers/platform/pricing/` |
| Cloudflare Workers limits, typical CPU use, error 1102 | `https://developers.cloudflare.com/workers/platform/limits/` |
| Cloudflare R2 prices and free amounts | `https://developers.cloudflare.com/r2/pricing/` |
| Cloudflare R2: adding it to an account | `https://developers.cloudflare.com/r2/get-started/` |
| Cloudflare D1 prices and free amounts | `https://developers.cloudflare.com/d1/platform/pricing/` |
| Cloudflare Zero Trust plans (Access) | `https://www.cloudflare.com/plans/sase-zero-trust.md` |
| Cloudflare Zero Trust sign-up and payment details | `https://developers.cloudflare.com/cloudflare-one/setup/` |
| Cloudflare rate limiting rules and custom rules per plan | `https://developers.cloudflare.com/waf/rate-limiting-rules/`, `https://developers.cloudflare.com/waf/custom-rules/` |
| GitHub Actions billing | `https://docs.github.com/en/billing/concepts/product-billing/github-actions` |
| GitHub Packages billing | `https://docs.github.com/en/billing/concepts/product-billing/github-packages` |
| GitHub plans and prices | `https://docs.github.com/en/get-started/learning-about-github/githubs-plans`, `https://github.com/pricing` |
| Medusa plans | `https://medusajs.com/pricing/` |

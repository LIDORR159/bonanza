# GitHub Actions

Six workflows live in `.github/workflows`. Two run by themselves on pushes, one runs weekly, and three run only when the repository owner starts them. This document says what each one does, what it needs, what a failure means, and what is still undecided about deploying from GitHub.

**No workflow deploys anything.** There is no server to deploy to. The two workflows with "deploy" in their file names are inert: one prints the request it would send, the other checks that a build still works.

The repository is public. It was made public on 2026-11-23 at the owner's request. This document is written for a public repository; [If the repository is made private again](#if-the-repository-is-made-private-again) lists what would change. The comments at the top of `ci.yml`, `e2e.yml` and `images.yml` were written while it was private and still talk about a limited allowance of minutes and storage.

## Status on 2026-11-23

The workflows were pushed for the first time on 2026-11-23. This is what had happened by 13:48 UTC that day, read from GitHub with `gh run list` and `gh run view`:

| Workflow | Runs so far | Result |
|---|---|---|
| CI | Three, on three pushes | All passed. The first took about 2 minutes. |
| E2E | Three | The first passed in 11 minutes 23 seconds: 106 tests, 103 passed, 3 skipped, none retried. The second was cancelled by a newer push, which is what the workflow is set to do. The third, on commit `372a77f`, passed in about 8 minutes: 107 tests, 104 passed, 3 skipped, none retried. |
| Security | Two, both started by hand | The first **failed on a finding**: four high-severity advisories in `nodemailer`. After the upgrade the second passed all four scans. See [The first Security runs](#the-first-security-runs). |
| Images | None | Never run. |
| Deploy backend (inert) | None | Never run. |
| Storefront on Workers (build check, inert) | None | Never run on GitHub. The same build has completed on a development machine. |

A handful of runs is not a track record. [What to watch on the first runs](#what-to-watch-on-the-first-runs) lists what is still unknown.

## The six workflows at a glance

| File | Name on GitHub | Runs when | Runner | Uses a secret | Changes anything outside the run |
|---|---|---|---|---|---|
| `ci.yml` | CI | Pull requests, and pushes to `main` | `ubuntu-24.04` | No | No |
| `e2e.yml` | E2E | Pushes to `main` that touch the applications; by hand | `ubuntu-24.04` | No | No |
| `security.yml` | Security | Mondays at 03:17 UTC; by hand | `ubuntu-24.04` | Only the run's own token | No |
| `images.yml` | Images | By hand, by the repository owner | `ubuntu-24.04-arm` | Only the run's own token, with permission to write packages | **Yes: pushes two container images to GitHub's Container registry** |
| `deploy-backend.yml` | Deploy backend (inert) | By hand, by the repository owner, from the default branch | `ubuntu-24.04` | No | No |
| `deploy-storefront-workers.yml` | Storefront on Workers (build check, inert) | By hand, by the repository owner | `ubuntu-24.04` | No | No |

"The run's own token" is the `GITHUB_TOKEN` that GitHub issues to every run and withdraws when it ends. Nobody has to create or store it.

Things all six share:

- Each declares `permissions: contents: read` at the top. Only `images.yml` adds `packages: write`.
- Every checkout uses `persist-credentials: false`, so the token is not left in the working copy.
- Every third-party action is pinned to a commit. See [Pinned actions](#pinned-actions).
- The three owner-only workflows carry `if: github.actor == github.repository_owner`. When someone else starts one, its job is skipped; the run shows as skipped, not failed.

## What each workflow does

### CI (`ci.yml`)

**What it does.** One job, in this order: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test`. The build comes before the type check on purpose: the backend's types include files that `medusa build` generates. `pnpm test` runs the unit tests of the storefront (Vitest, 25 tests) and the backend (Jest, 24 tests), not the browser suite.

**When.** On every pull request and every push to `main`, unless the change touches only Markdown files, `docs/`, `infrastructure/`, `logos/` or `photos-examples/`. A newer push to the same branch or pull request cancels a run still in progress.

**What it needs.** Nothing. Neither build needs a database, a running backend or any setting.

**What a failure means.** The commit does not lint, build, type-check or pass its unit tests. Open the run and read the first red step. Do not build images from a commit whose CI run failed.

**Pull requests from forks.** A public repository accepts pull requests from anyone. The trigger is `pull_request`, never `pull_request_target`: GitHub does not pass secrets to a run started from a fork and gives it a read-only token, and this workflow uses no secret anyway. By default GitHub also waits for the owner's approval before running workflows for a first-time contributor.

### E2E (`e2e.yml`)

**What it does.** It reproduces the local flow from [local-development.md](local-development.md) on the runner: `pnpm dev:setup` (fresh random secrets, PostgreSQL, Redis and Mailpit from `compose.yaml`, migrations, the admin user, the demo catalog), then `pnpm dev` in the background, then `pnpm e2e` once the backend's `/health` and the storefront's home page answer. `CI=true` makes Playwright retry a failed test once.

**When.** On pushes to `main` that touch `apps/`, `packages/`, `e2e/`, `scripts/setup-dev.mjs`, `compose.yaml`, `.env.example`, the root `package.json`, the lockfile, `pnpm-workspace.yaml` or the workflow itself; and by hand. It never runs on a pull request, so a pull request from a fork cannot start it. A newer push cancels a run in progress. The time limit is 45 minutes.

**What it needs.** No secret. Everything it signs in with is generated on the runner and discarded with it.

**What a failure means.** Either the stack did not come up (the setup or start step is red) or a browser test failed twice. On failure the run prints the last 200 lines of the application log and keeps the Playwright report as an artifact named `playwright-report` for 3 days. A test that failed once and passed on the retry is reported as flaky: the run is green, and the test still needs looking at. A run marked cancelled was replaced by a newer push and says nothing about the code.

**What it does not cover.** It tests the development servers. The suite has also been run against a production build of the storefront, by hand on a development machine ([production-readiness.md](production-readiness.md#summary)). It does not test the container images.

**What is public.** Run logs and artifacts of a public repository can be read by anyone who can read the repository. The traces in a failed run's report can contain the admin password generated for that run. That password existed only on the runner, which is gone by then.

### Security (`security.yml`)

**What it does.** Four checks, each of which runs even if an earlier one failed:

| Check | Looks at | Fails the run on |
|---|---|---|
| `pnpm audit --prod --audit-level high` | The production dependencies in the lockfile | A high or critical advisory |
| gitleaks | Every commit in the git history | Anything that looks like a committed secret |
| Trivy, file scan | Vulnerabilities and secrets in the files | A high or critical vulnerability that has a fix, or a secret |
| Trivy, configuration scan | The Dockerfiles and the Terraform files | A high or critical misconfiguration |

**When.** Mondays at 03:17 UTC, and by hand. Never on a pull request.

**What it needs.** The run's own token, which gitleaks reads. The workflow's comment says the gitleaks action needs no licence key while the repository belongs to a personal account, and would require a `GITLEAKS_LICENSE` secret under an organization. That was not checked against the action's documentation.

**What a failure means.** A finding, not a broken build. Open the run to see which check is red. The workflow relies on GitHub's email about a failed run to get a new advisory noticed; whether that email arrives depends on the account's notification settings and has not been confirmed. A finding is either fixed (upgrade the package, remove the secret and rotate it, change the file) or accepted on purpose; there is no ignore list in the repository.

**What it does not cover.** Container images are not scanned. None has been published.

**One thing that can switch it off.** In a public repository GitHub disables scheduled workflows after 60 days without repository activity. If the repository is quiet for two months, re-enable the workflow on the Actions tab.

#### The first Security runs

| Run | Commit | Result |
|---|---|---|
| First, by hand, 2026-11-23 | `862eb34` | Failed at `pnpm audit`. Four high-severity advisories, all in `nodemailer`, the backend's email library: `GHSA-p6gq-j5cr-w38f`, `GHSA-2x7j-588g-ccc2`, `GHSA-v53p-9fqp-m79j`, `GHSA-r7g4-qg5f-qqm2`. The audit also listed 16 moderate and 1 low advisory, which do not fail the run. gitleaks and both Trivy scans passed. |
| Second, by hand, 2026-11-23 | `27bfb1e` | Passed all four checks. |

Between the two, `nodemailer` was upgraded from the 7 series to 10.6.1, and the lead engineer re-tested the password-reset and order emails. The moderate and low advisories reported by the first run have not been reviewed here.

The gitleaks check covers every commit, so the history that became public on 2026-11-23 has been scanned once and came back clean.

### Images (`images.yml`)

**What it does.** It builds the backend and the storefront images for `linux/arm64`, one after the other, on an ARM64 runner (the server is ARM64, so nothing is emulated), and pushes each to GitHub's Container registry tagged with the commit SHA. Then it prints both image digests and compressed sizes in the run summary. Those two digest references are what a deployment takes.

**Inputs.** Both are compiled into an image, so both are checked before anything is built.

| Input | Goes into | Leave empty and |
|---|---|---|
| `image_hostnames` | The storefront image: the hosts images may be loaded from (the media hostname), comma-separated, no spaces | Only `localhost` is allowed, and pictures from the media bucket are refused |
| `storefront_url` | The backend image: the public storefront address, as `https://…` | One link in the admin points at `http://localhost:8000` |

The reasons are in [the Docker README](../infrastructure/docker/README.md#building). An image built before the media hostname is known has to be built again once it is.

**What it needs.** The run's own token with `packages: write`. No other secret.

**What a failure means.** The inputs are malformed (the first step says so), an image does not build, or the registry refused the push. A failed run may have pushed the backend image and not the storefront image; do not deploy half a pair.

**The image names are fixed in three places** that must agree: `BACKEND_IMAGE` and `STOREFRONT_IMAGE` in `images.yml`, the checks in `deploy-backend.yml`, and the patterns in `infrastructure/ops/ssh-deploy-entrypoint.sh`. All three contain the name of the account that owns the repository. If the repository moves to another account, change all three together.

**An image is private when first pushed, even from a public repository.** GitHub's documentation says a new package starts private, inherits the linked repository's access permissions but not its visibility, and cannot be made private again once it has been made public. While the images are private, the server has to be signed in to the registry to pull them ([oracle-deployment.md](oracle-deployment.md#first-deployment)). The builds read no secret and the build context is an allowlist, but publishing the images is the owner's decision and cannot be undone.

### Deploy backend (`deploy-backend.yml`), inert

**What it does today.** It checks that the two image references are pinned by digest and name the expected images, prints the request it would send to the server, and stops. It contacts nothing.

**What a failure means.** A reference is not of the form `…@sha256:` followed by 64 hex digits, or names a different image. That is the same rule the server applies, narrowed to digests, because a tag can be moved after it was reviewed and a digest cannot.

**Why it exists.** So that the checks and the shape of the request are settled before the open question below is.

### Storefront on Workers (`deploy-storefront-workers.yml`), inert

**What it does today.** It runs `pnpm --filter @bonanza/storefront cf:build` and reports the size of the output. It never calls `wrangler deploy` and refers to no Cloudflare credential.

**What a failure means.** The Cloudflare Workers target of the storefront no longer builds. That target is optional and not in use, so a failure here does not affect the store; see [cloudflare-deployment.md](cloudflare-deployment.md#the-workers-target-for-the-storefront).

**What is known.** The same command completed on a development machine on 2026-11-23, and the local preview served pages. The workflow itself has never been started on GitHub.

## Pinned actions

A workflow that says `uses: some/action@v4` runs whatever commit that tag points to at the time, and tags can be moved. Every action here is therefore pinned to a full commit SHA, with the release tag in a comment beside it:

| Action | Pinned release |
|---|---|
| `actions/checkout` | v7.0.1 |
| `actions/setup-node` | v7.1.0 |
| `actions/upload-artifact` | v7.0.2 |
| `pnpm/action-setup` | v6.1.1 |
| `docker/setup-buildx-action` | v4.4.1 |
| `docker/login-action` | v4.8.0 |
| `docker/build-push-action` | v7.4.0 |
| `gitleaks/gitleaks-action` | v3.0.0 |
| `aquasecurity/trivy-action` | v0.36.0 |

On 2026-11-23 each of the nine SHAs was compared with the commit its tag points to in the action's own repository (`git ls-remote`), and all nine matched.

A pin does not update itself, and nothing in the repository proposes updates. To move an action to a newer release:

1. Read the release notes of the new version in the action's repository.
2. Find the commit the release tag points to:

   ```bash
   git ls-remote https://github.com/actions/checkout 'refs/tags/v7.0.1*'
   ```

   If two lines come back, use the SHA on the line that ends in `^{}`; that is the commit. Otherwise use the only line.
3. Replace the SHA **and** the version comment in every workflow that uses the action. `actions/checkout`, for example, appears in five files.
4. Push, and watch the next run of each workflow you changed.

The scanners that the Security workflow runs are themselves third-party code with access to the whole repository. Review their updates with the same care as an application dependency.

## Secrets

**No workflow needs a repository secret, variable or environment today, and according to the lead engineer none is configured (2026-11-23).** The secrets list itself could not be read while writing this. The workflow files refer to exactly one secret, `secrets.GITHUB_TOKEN`, in two places (`security.yml` and `images.yml`).

What each manual workflow would need if it were made real, taken from the workflow files:

| Workflow | Today | To do real work |
|---|---|---|
| Images | The run's own token | Nothing more. |
| Deploy backend | Nothing | Depends on the path chosen under [The open deployment question](#the-open-deployment-question). The proposed path names: a Cloudflare Access service token; the private half of a dedicated SSH key; and the server's SSH host key, pinned in the workflow. None of these exists, and no secret names have been chosen. |
| Storefront on Workers | Nothing | A Cloudflare API token limited to deploying this one Worker, and the storefront's own settings and secrets set on the Worker itself (`REVALIDATE_SECRET`, `CMS_PREVIEW_SECRET`), not in GitHub. None of these exists. |

Rules to keep when secrets are added:

- A workflow that can be started by a pull request must never be given one. Today only `ci.yml` runs on pull requests.
- Prefer a secret that can do one thing: a deploy key that can run one script, an API token for one Worker.
- Never print a secret. The run logs of this repository are public.
- Put deployment secrets in an environment with a required reviewer, not at repository level. See the next section.

## Cost and limits

The figures below are from GitHub's own documentation, read on 2026-11-23. The pages are listed under [Sources](#sources).

| | For this public repository |
|---|---|
| **Standard runners** (`ubuntu-24.04`) | Free. GitHub's wording: "free and unlimited on public repositories". |
| **ARM64 runner** (`ubuntu-24.04-arm`, used by Images) | Listed among the standard runners for public repositories, so the same rule applies. |
| **Artifacts** | GitHub's billing page does not say how artifact storage is counted for a public repository. E2E keeps an artifact only when a run fails, for 3 days. |
| **Container images** | GitHub states that "container image storage and bandwidth for the Container registry is currently free" and promises a month's notice before that changes. Public packages are free in any case; a private package counts against 500 MB of Packages storage on GitHub Free. |
| **Protected branches** | Available. GitHub Free gives public repositories the full feature set. |
| **Deployment environments** | Available, with environment secrets and required reviewers. |
| **Scheduled workflows** | Disabled after 60 days without repository activity. |

What this means in practice:

- **Running the workflows costs nothing** while the repository is public and uses standard runners.
- **Keep to two pairs of images anyway.** The comment in `images.yml` budgets for 500 MB: one pair is about 236 MB compressed (measured locally on 2026-11-23), so two pairs fit, the running version and the one before it. GitHub's statement that Container registry storage is currently free makes that the cautious reading, not a limit enforced today. Two pairs is still what a rollback needs, and it stays safe if the policy changes.
- **The safety net against a bill** is not having a payment method on the GitHub account. See [cost-estimate.md](cost-estimate.md#github).

### Protections that are available and not set up

Checked through GitHub's API on 2026-11-23, except where noted:

| Protection | State |
|---|---|
| Deployment environments | None exist. |
| Rulesets | None exist. |
| A protection rule on `main` | Could not be read with the account available while writing this. The lead engineer reports none. |

So nothing technically stops a direct push to `main`, and nothing asks for a second approval before a manual workflow runs. Now that the repository is public, both can be added at no cost: a protection rule on `main`, and an environment with the owner as required reviewer in front of any workflow that will one day hold a deployment secret. Whether to add them is the owner's decision; this document does not assume it has been made.

### If the repository is made private again

On GitHub Free, a private repository changes four things:

| | Private repository on GitHub Free |
|---|---|
| Runner time | Draws on $12 of included usage a month. At GitHub's rates that is 2,000 minutes on a standard Linux runner ($0.006 a minute; $0.005 on ARM64). The runners are also smaller (2 cores against 4), so the same runs take longer. With no payment method on the account, runs are blocked when the amount is used up; with one, they are billed. |
| Storage | Artifacts and private packages share 500 MB. |
| Protected branches | Not available without GitHub Pro. |
| Environments | No environment secrets, no required reviewers. |

For scale: on the public repository's larger runners a CI run has taken between 1 and 2.5 minutes, and a complete E2E run 8 to 11 minutes.

## Why image builds and deploys are manual

- **A deployment replaces what customers are using.** Until a protected environment with a required reviewer stands in front of it, the only gate is who is allowed to press the button. So the button is pressed by hand, by the owner.
- **Each pair of images takes registry storage**, and only two pairs are ever needed. Building on every push would fill the registry with versions nobody deploys.
- **The Workers build is a check for an option that is not in use.** A real deployment there would cost money that has not been approved.
- **Deployments take digests, not tags.** The Images run prints two digest references. Those exact images are what was built from the commit that passed CI, and nothing can be swapped in under the same name afterwards.

## The open deployment question

**This is undecided.** Nothing below has been approved or built.

The server's SSH port will accept one address only: the administrator's (`admin_cidr` in the Terraform variables). A GitHub-hosted runner comes from a large, shared, changing pool of addresses. It cannot connect, and that pool must not be let in.

The header comment of `deploy-backend.yml` sets out the choices:

| Option | How it would work | For | Against |
|---|---|---|---|
| **Proposed: SSH through the Cloudflare Tunnel** | The runner connects through the tunnel the server already keeps open, behind a Cloudflare Access application that admits one service token. sshd then forces the deploy key through `infrastructure/ops/ssh-deploy-entrypoint.sh`. | Port 22 stays closed to the internet. Two separate credentials are needed and neither is enough alone. The deploy key cannot open a shell. The run sees the deployment's output and exit code. | Needs a tunnel, an Access application for an SSH hostname, a service token, a dedicated key pair and the server's host key pinned in the workflow. How the tunnel's container reaches the host's sshd **has not been designed or tested**. Does not exist in `direct` ingress mode, where there is no tunnel. |
| **Alternative: the server pulls** | A timer on the server asks the registry which version to run and calls `deploy.sh` itself. | GitHub holds no credential for the server at all. Nothing inbound. | Needs a new script on the server. A deployment waits for the next poll. The result does not come back to GitHub. |
| **Ruled out** | Opening port 22 to GitHub's address ranges. | | Lets in every other user of GitHub's runners. |
| **Ruled out** | A self-hosted runner on the server. | | It would hold Docker, which is root on that machine, and run whatever a workflow file says. |

Until one is approved and built, deploy by hand over SSH, from the administrator's address:

```bash
/opt/bonanza/ops/deploy.sh <backend-ref> <storefront-ref>
```

The two references come from the summary of an Images run. The procedure is in [oracle-deployment.md](oracle-deployment.md#first-deployment). The Cloudflare side of the proposed option is in [the Cloudflare README](../infrastructure/cloudflare/README.md#if-deployments-from-github-are-approved-later).

## Rollback

Rollback happens on the server, not in GitHub.

```bash
/opt/bonanza/ops/rollback.sh                                    # back to the previous pair of images
/opt/bonanza/ops/rollback.sh <backend-ref> <storefront-ref>     # to a specific pair
```

How it works, from `infrastructure/ops/rollback.sh` and `deploy.sh`:

- Every deployment saves the pair it replaces in `/opt/bonanza/images.env.previous`. With no arguments, `rollback.sh` redeploys that pair. After it succeeds, that file holds the version that was rolled back *from*, so running it again returns to it.
- It hands the pair to `deploy.sh --rollback`: the same pull, start and health check as a deployment, **without the migration step**.
- **Database migrations are not rolled back.** The older code runs against whatever schema the newer version left behind. That is safe only when the migration added things the old code ignores. The header of `deploy.sh` explains how to ship a destructive change in two releases.
- If the older image is no longer on the server (a weekly job removes unused images older than 7 days), it is pulled from the registry again. This is why the registry must still hold the previous pair.
- Exit codes are those of `deploy.sh`: 0 done and healthy, 10 failed and the earlier state was restored, 11 failed and not restored, which needs attention at once.

A failed deployment also rolls itself back: `deploy.sh` restores the previous pair when any step fails.

`deploy-backend.yml` offers `rollback` as a request, and `ssh-deploy-entrypoint.sh` accepts it. Today the workflow only prints it.

**What has and has not been exercised.** During local container validation, `deploy.sh` succeeded, and with a deliberately broken storefront image it exited 10 and restored the previous version ([validation record](../infrastructure/docker/README.md#validation-record)). **`rollback.sh` itself has never been run**, by hand or through the SSH entry point. Rehearse it on the real server before the store takes orders.

## What to watch on the first runs

| Workflow | What is known | What to watch |
|---|---|---|
| CI | Three green runs, each under 3 minutes | That pull-request runs behave the same as push runs. That the `paths-ignore` list does not skip a change that matters: a change under `infrastructure/` alone starts no run, so a broken Dockerfile is not caught here. |
| E2E | Two complete green runs, no retries, 8 and 11 minutes | Flaky tests over the next runs. The total time against the 45-minute limit as the suite grows. Whether the artifact upload works; it only happens on failure and has not been exercised. |
| Security | One red run, then one green | That the Monday schedule actually fires; scheduled runs can start late when GitHub is busy. That a failure email reaches the owner. The moderate advisories the audit lists and does not fail on. |
| Images | Never run | Build time on the ARM64 runner against the 30-minute limit. The compressed sizes in the summary against the 236 MB measured locally. Whether each package arrives private, and whether it is linked to the repository. That the two digests printed are the ones the server can pull. |
| Deploy backend (inert) | Never run | Only that it accepts a real pair of digest references and refuses a tag. |
| Storefront on Workers (inert) | Never run on GitHub | That the build that works locally also completes on the runner. |

The first Images run will prove that the images build on GitHub. It does not replace validating the stack built from them, which is described in [production-readiness.md](production-readiness.md#what-must-be-re-verified-before-launch).

## Sources

GitHub's documentation, read on 2026-11-23. Check these again before relying on a number.

| Topic | Page |
|---|---|
| Actions billing: included usage, per-minute rates, what happens at the limit, shared storage | `https://docs.github.com/en/billing/concepts/product-billing/github-actions` |
| Standard runners for public and private repositories, including ARM64 | `https://docs.github.com/en/actions/reference/runners/github-hosted-runners` |
| Packages billing, and the Container registry statement | `https://docs.github.com/en/billing/concepts/product-billing/github-packages` |
| Package visibility and inheritance | `https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility` |
| Plans: what GitHub Free and GitHub Pro include | `https://docs.github.com/en/get-started/learning-about-github/githubs-plans` |
| Environments: required reviewers, wait timers, environment secrets | `https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments` |
| Scheduled workflows; secrets and tokens for pull requests from forks | `https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows` |
| Approval for workflows from first-time contributors | `https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository` |

Not verified from GitHub's documentation: whether rulesets are available to this repository on its plan, and how artifact storage is counted for a public repository.

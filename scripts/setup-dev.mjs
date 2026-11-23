#!/usr/bin/env node
/**
 * One-command local setup:
 *   1. writes the per-app env files from .env.example (never overwrites)
 *   2. starts postgres, redis and mailpit
 *   3. runs database migrations (which also create the store, region, tax and
 *      shipping setup)
 *   4. creates the first admin user
 *   5. copies the publishable API key into the storefront env file
 *   6. loads demo catalog and content
 *
 * Safe to run again: every step skips what already exists.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const backendDir = join(root, "apps/backend")
const skipSeed = process.argv.includes("--no-seed")
const envOnly = process.argv.includes("--env-only")

const log = (message) => console.log(`\n▸ ${message}`)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root, ...options })
  if (result.status !== 0 && !options.allowFailure) {
    console.error(`\nCommand failed: ${command} ${args.join(" ")}`)
    process.exit(result.status ?? 1)
  }
  return result.status === 0
}

function readEnvFile(path) {
  const values = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) values[match[1]] = match[2]
  }
  return values
}

// ── 1. Env files ─────────────────────────────────────────────────────────────
log("Writing env files")
const sections = new Map()
let current = null
for (const line of readFileSync(join(root, ".env.example"), "utf8").split("\n")) {
  const marker = line.match(/^#@file (.+)$/)
  if (marker) {
    current = marker[1].trim()
    sections.set(current, [])
  } else if (current) {
    sections.get(current).push(line)
  }
}

// A variable that appears in several files (shared secrets) must get the same
// value in each, including when one of the files already exists.
const generated = {}
for (const path of sections.keys()) {
  const target = join(root, path)
  if (existsSync(target)) Object.assign(generated, readEnvFile(target))
}

for (const [path, lines] of sections) {
  const target = join(root, path)
  if (existsSync(target)) {
    console.log(`  ${path} exists, left unchanged`)
    continue
  }
  const content = lines
    .map((line) => {
      const match = line.match(/^([A-Z0-9_]+)=__GENERATE__$/)
      if (!match) return line
      const name = match[1]
      const existing = generated[name]
      if (!existing || existing === "__GENERATE__") {
        generated[name] = randomBytes(32).toString("hex")
      }
      return `${name}=${generated[name]}`
    })
    .join("\n")
  writeFileSync(target, content.trimEnd() + "\n", { mode: 0o600 })
  console.log(`  ${path} created`)
}

if (envOnly) {
  process.exit(0)
}

// ── 2. Services ──────────────────────────────────────────────────────────────
log("Starting postgres, redis and mailpit")
run("docker", ["compose", "up", "-d", "--wait"])

// ── 3. Migrations ────────────────────────────────────────────────────────────
log("Running database migrations")
run("pnpm", ["exec", "medusa", "db:migrate"], { cwd: backendDir })

// ── 4. Admin user ────────────────────────────────────────────────────────────
const backendEnv = readEnvFile(join(backendDir, ".env"))
log(`Creating admin user ${backendEnv.ADMIN_EMAIL}`)
const created = spawnSync(
  "pnpm",
  ["exec", "medusa", "user", "-e", backendEnv.ADMIN_EMAIL, "-p", backendEnv.ADMIN_PASSWORD],
  { cwd: backendDir, encoding: "utf8" }
)
if (created.status === 0) {
  console.log("  created. The password is ADMIN_PASSWORD in apps/backend/.env")
} else if (/already exists|duplicate/i.test(`${created.stdout}${created.stderr}`)) {
  console.log("  already exists")
} else {
  console.error(created.stdout, created.stderr)
  process.exit(1)
}

// ── 5. Publishable key ───────────────────────────────────────────────────────
log("Reading the publishable API key")
const storefrontEnvPath = join(root, "apps/storefront/.env.local")
const key = execFileSync(
  "docker",
  [
    "compose", "exec", "-T", "postgres", "psql", "-U", "bonanza", "-d", "bonanza", "-tAc",
    "select token from api_key where type = 'publishable' and revoked_at is null and deleted_at is null order by created_at limit 1",
  ],
  { cwd: root, encoding: "utf8" }
).trim()
if (!key) {
  console.error("  no publishable key found in the database")
  process.exit(1)
}
if (existsSync(storefrontEnvPath)) {
  const env = readFileSync(storefrontEnvPath, "utf8")
  writeFileSync(
    storefrontEnvPath,
    env.replace(
      /^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*$/m,
      `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${key}`
    )
  )
  console.log("  written to apps/storefront/.env.local")
}

// ── 6. Demo data ─────────────────────────────────────────────────────────────
if (skipSeed) {
  log("Skipping demo data (--no-seed)")
} else {
  log("Loading demo catalog and content")
  run("pnpm", ["exec", "medusa", "exec", "./src/scripts/seed-demo.ts"], { cwd: backendDir })
}

console.log(`
Done.

  pnpm dev                 start backend and storefront
  http://localhost:8000    storefront
  http://localhost:9000/app  admin  (${backendEnv.ADMIN_EMAIL}, password in apps/backend/.env)
  http://localhost:8025    captured emails
`)

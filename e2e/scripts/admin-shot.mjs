#!/usr/bin/env node
/**
 * Signs in to the admin and captures one of its pages.
 *
 *   node scripts/admin-shot.mjs <app-path> <name> [--out <dir>] [--lang he]
 */
import { readFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const args = process.argv.slice(2)
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const [path = "/content", name = "admin"] = args.filter(
  (arg, index) => !arg.startsWith("--") && !["--out", "--lang"].includes(args[index - 1])
)
const here = dirname(fileURLToPath(import.meta.url))
const outDir = option("--out", join(here, "../../docs/screenshots"))
mkdirSync(outDir, { recursive: true })

const env = Object.fromEntries(
  readFileSync(join(here, "../../apps/backend/.env"), "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
)
const base = process.env.BACKEND_URL || "http://localhost:9000"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
page.on("console", (message) => message.type() === "error" && errors.push(message.text()))

await page.goto(`${base}/app/login`, { waitUntil: "networkidle" })
await page.locator('input[name="email"]').fill(env.ADMIN_EMAIL)
await page.locator('input[name="password"]').fill(env.ADMIN_PASSWORD)
await page.locator('button[type="submit"]').click()
await page.waitForURL(/\/app\/(?!login)/, { timeout: 30000 })

const language = option("--lang", "")
if (language) {
  await page.evaluate((lng) => localStorage.setItem("lng", lng), language)
}
await page.goto(`${base}/app${path}`, { waitUntil: "networkidle" })
await page.waitForTimeout(1200)
const file = join(outDir, `${name}.png`)
await page.screenshot({ path: file })
console.log(file)
if (errors.length) {
  console.log("console errors:\n" + [...new Set(errors)].slice(0, 6).join("\n").slice(0, 900))
}
await browser.close()

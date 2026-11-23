#!/usr/bin/env node
/**
 * Captures storefront screenshots for comparison with the design references.
 *
 *   node scripts/screenshot.mjs <url-path> <name> [--mobile] [--viewport-only] [--y <px>] [--out <dir>]
 *
 * Writes <name>-desktop.png, or <name>-mobile.png with --mobile.
 * --viewport-only captures one screen; --y scrolls to that offset first.
 */
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, devices } from "@playwright/test"

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const [path = "/", name = "page"] = args.filter((arg, index) => {
  const previous = args[index - 1]
  return !arg.startsWith("--") && !["--out", "--base", "--y"].includes(previous)
})

const base = option("--base", process.env.STOREFRONT_URL || "http://localhost:8000")
const outDir = option(
  "--out",
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots")
)
mkdirSync(outDir, { recursive: true })

const mobile = flag("--mobile")
const browser = await chromium.launch()
const context = await browser.newContext(
  mobile
    ? { ...devices["iPhone 13"], locale: "he-IL" }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "he-IL" }
)
const page = await context.newPage()
await page.goto(base + path, { waitUntil: "networkidle" })
// Let web fonts and entrance animations settle.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(900)

// Scroll through the page so lazily loaded images and scroll reveals appear.
// `behavior: "instant"` matters: the site scrolls smoothly, and a smooth scroll
// restarted every 120 ms never gets anywhere.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo({ top: y, behavior: "instant" })
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  window.scrollTo({ top: 0, behavior: "instant" })
})
await page.waitForTimeout(900)

const offset = Number(option("--y", 0))
if (offset) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), offset)
  await page.waitForTimeout(300)
}

const file = join(outDir, `${name}-${mobile ? "mobile" : "desktop"}.png`)
await page.screenshot({ path: file, fullPage: !flag("--viewport-only") })
console.log(file)
await browser.close()

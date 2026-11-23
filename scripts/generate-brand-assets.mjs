#!/usr/bin/env node
/**
 * Produces web-sized copies of the brand logos for the storefront.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * The files in `logos/` are the originals and are never edited. Everything
 * written here is a resized or cropped copy of them: nothing is redrawn.
 */
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const lockup = join(root, "logos/header logo.png")
const out = join(root, "apps/storefront/public/brand")
const app = join(root, "apps/storefront/app")
mkdirSync(out, { recursive: true })

// Trim the transparent margin once so every size is tightly cropped.
const trimmed = await sharp(lockup).trim().toBuffer()
const { width, height } = await sharp(trimmed).metadata()
console.log(`Lockup after trimming: ${width}x${height}`)

// The full lockup: wordmark with the arched top, subtitle and barber pole.
for (const size of [360, 720, 1440]) {
  await sharp(trimmed)
    .resize({ width: size })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(join(out, `bonanza-lockup-${size}.webp`))
}
await sharp(trimmed).resize({ width: 720 }).png().toFile(join(out, "bonanza-lockup-720.png"))

// The barber pole on its own, cropped from the right edge of the lockup. The
// crop starts just right of the final "A" and stops above the subtitle.
const poleLeft = Math.round(width * 0.878)
const poleBox = {
  left: poleLeft,
  top: 0,
  width: width - poleLeft,
  height: Math.round(height * 0.86),
}
// The rule under the wordmark ends inside this box, beside the pole's lower
// finial. Erase that corner so only the pole is left.
const eraser = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${poleBox.width}" height="${poleBox.height}"><rect x="0" y="${Math.round(poleBox.height * 0.9)}" width="${Math.round(poleBox.width * 0.3)}" height="${poleBox.height}" fill="#000"/></svg>`
)
const pole = await sharp(
  await sharp(trimmed)
    .extract(poleBox)
    .composite([{ input: eraser, blend: "dest-out" }])
    .png()
    .toBuffer()
)
  .trim()
  .toBuffer()
const poleMeta = await sharp(pole).metadata()
console.log(`Pole crop: ${poleMeta.width}x${poleMeta.height}`)
await sharp(pole).resize({ height: 512 }).webp({ quality: 92 }).toFile(join(out, "barber-pole.webp"))

// Icons: the pole centred on the site's dark background.
const icon = async (size, file, padding = 0.14) => {
  const inner = Math.round(size * (1 - padding * 2))
  const poleResized = await sharp(pole).resize({ height: inner, fit: "inside" }).toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#0d0e0f" },
  })
    .composite([{ input: poleResized, gravity: "center" }])
    .png()
    .toFile(file)
}
await icon(512, join(app, "icon.png"))
await icon(180, join(app, "apple-icon.png"))
await icon(192, join(out, "icon-192.png"))
await icon(512, join(out, "icon-512.png"))

// Social sharing image: the lockup on the dark background, 1200x630.
const ogLockup = await sharp(trimmed).resize({ width: 820 }).toBuffer()
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#0d0e0f" } })
  .composite([{ input: ogLockup, gravity: "center" }])
  .jpeg({ quality: 88 })
  .toFile(join(out, "og-default.jpg"))

console.log(`Brand assets written to ${out}`)

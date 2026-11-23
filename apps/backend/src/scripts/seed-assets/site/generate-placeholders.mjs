#!/usr/bin/env node
/**
 * Draws the placeholder pictures the demo seed uses for the gallery and the
 * team, and writes them next to this file as WebP.
 *
 *   node apps/backend/src/scripts/seed-assets/site/generate-placeholders.mjs
 *
 * They are plain grey drawings marked SAMPLE, so nobody mistakes them for real
 * work or real people. The real photographs are uploaded through the admin.
 * (`hero.jpg` and `about.jpg` in this folder are photographs and are not made
 * here.)
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const outDir = dirname(fileURLToPath(import.meta.url))

const GALLERY = 8
const TEAM = 3
const SIZE = 1200

const frame = (id, tone, inner) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx=".5" cy=".42" r=".6">
      <stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg-${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow-${id})"/>
  ${inner}
  <rect x="24" y="24" width="${SIZE - 48}" height="${SIZE - 48}" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>
</svg>`

const label = (text) => `
  <text x="600" y="1096" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="44"
        letter-spacing="14" fill="#fff" fill-opacity=".55">${text}</text>`

/** Diagonal barber-pole bands, at a different angle and spacing per picture. */
const bands = (index) => {
  const angle = [-32, 28, -18, 40, -44, 14, -26, 34][index % 8]
  const gap = 150 + (index % 3) * 40
  const lines = Array.from(
    { length: 16 },
    (_, i) => `<rect x="-600" y="${-600 + i * gap}" width="2400" height="${gap / 2.6}" fill="#fff" opacity="${i % 2 ? 0.05 : 0.09}"/>`
  ).join("")
  return `<g transform="rotate(${angle} 600 600)">${lines}</g>`
}

const TONES = [
  ["#1b1c1e", "#34363a"], ["#232427", "#101112"], ["#2b2d30", "#18191b"], ["#151617", "#2f3134"],
  ["#303236", "#1a1b1d"], ["#1e1f22", "#3a3c40"], ["#28292c", "#0f1011"], ["#17181a", "#2a2c2f"],
]

const galleryPicture = (index) =>
  frame(
    `g${index}`,
    TONES[index % TONES.length],
    `${bands(index)}
  <circle cx="600" cy="520" r="210" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="6"/>
  <text x="600" y="590" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="200"
        font-weight="700" fill="#fff" fill-opacity=".8">${String(index + 1).padStart(2, "0")}</text>
  ${label("SAMPLE PHOTO")}`
  )

const teamPicture = (index) =>
  frame(
    `t${index}`,
    TONES[(index * 3 + 1) % TONES.length],
    `<circle cx="600" cy="430" r="150" fill="#fff" fill-opacity=".32"/>
  <path d="M300 960 Q300 660 600 660 Q900 660 900 960 Z" fill="#fff" fill-opacity=".32"/>
  ${label(`SAMPLE ${index + 1}`)}`
  )

const pictures = [
  ...Array.from({ length: GALLERY }, (_, i) => [`gallery-${i + 1}.webp`, galleryPicture(i)]),
  ...Array.from({ length: TEAM }, (_, i) => [`team-${i + 1}.webp`, teamPicture(i)]),
]

for (const [name, svg] of pictures) {
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer()
  writeFileSync(join(outDir, name), buffer)
}
console.log(`Wrote ${pictures.length} placeholder pictures to ${outDir}`)

#!/usr/bin/env node
/**
 * Draws the product illustrations used by the demo catalog and writes them as
 * transparent WebP files to apps/backend/src/scripts/seed-assets/.
 *
 *   node scripts/generate-demo-images.mjs            write the images
 *   node scripts/generate-demo-images.mjs --sheet    also write a contact sheet
 *
 * They are original drawings, made so the demo store needs no third-party
 * photography. Real product photos are uploaded through the admin.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/backend/src/scripts/seed-assets"
)
mkdirSync(outDir, { recursive: true })

const SIZE = 1200

/** Shared paint: matte black bodies, brushed metal, soft highlights. */
const defs = (accent = "#c9cbd0") => `
<defs>
  <linearGradient id="body" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#0c0d0e"/><stop offset=".28" stop-color="#2c2e31"/>
    <stop offset=".55" stop-color="#17181a"/><stop offset="1" stop-color="#060607"/>
  </linearGradient>
  <linearGradient id="bodyV" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#303236"/><stop offset=".5" stop-color="#151617"/><stop offset="1" stop-color="#08090a"/>
  </linearGradient>
  <linearGradient id="metal" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#6d7075"/><stop offset=".3" stop-color="#eceef1"/>
    <stop offset=".55" stop-color="#9da1a7"/><stop offset=".8" stop-color="#dfe1e5"/><stop offset="1" stop-color="#5d6065"/>
  </linearGradient>
  <linearGradient id="metalV" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#f1f2f4"/><stop offset=".5" stop-color="#a3a7ad"/><stop offset="1" stop-color="#63666b"/>
  </linearGradient>
  <linearGradient id="glass" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#1c120a"/><stop offset=".3" stop-color="#6a4322"/>
    <stop offset=".6" stop-color="#3a2412"/><stop offset="1" stop-color="#120b06"/>
  </linearGradient>
  <linearGradient id="accent" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="${accent}" stop-opacity=".75"/><stop offset=".4" stop-color="${accent}"/>
    <stop offset="1" stop-color="${accent}" stop-opacity=".6"/>
  </linearGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
</defs>`

const shadow = (cx, cy, rx, ry = 34) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow)"/>`
const shine = (x, y, w, h, r = w / 2, o = 0.16) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" opacity="${o}"/>`
const teeth = (x, y, count, pitch, w, h, fill = "url(#metalV)") =>
  Array.from(
    { length: count },
    (_, i) => `<rect x="${x + i * pitch}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}"/>`
  ).join("")

// ── Drawings ────────────────────────────────────────────────────────────────

const clipper = () => `
${shadow(600, 1085, 200)}
<path d="M470 300 Q470 250 520 250 H680 Q730 250 730 300 L752 930 Q756 1050 600 1050 Q444 1050 448 930 Z" fill="url(#body)"/>
<path d="M486 250 H714 L706 180 H494 Z" fill="url(#metal)"/>
${teeth(498, 132, 14, 15, 8, 52)}
<rect x="486" y="176" width="228" height="14" fill="#2a2c2f"/>
<rect x="742" y="330" width="26" height="150" rx="13" fill="url(#metalV)"/>
<rect x="520" y="560" width="160" height="12" rx="6" fill="url(#accent)"/>
<circle cx="600" cy="690" r="34" fill="#0a0b0c" stroke="url(#accent)" stroke-width="6"/>
<rect x="566" y="1012" width="68" height="20" rx="10" fill="#2f3135"/>
${shine(498, 300, 26, 600, 13)}`

const trimmer = () => `
${shadow(600, 1085, 170)}
<path d="M520 330 Q520 290 556 290 H644 Q680 290 680 330 L694 950 Q696 1050 600 1050 Q504 1050 506 950 Z" fill="url(#body)"/>
<path d="M452 290 H748 L738 232 H462 Z" fill="url(#metal)"/>
${teeth(466, 196, 19, 14.5, 7, 40)}
<rect x="452" y="230" width="296" height="10" fill="#25272a"/>
<rect x="560" y="470" width="80" height="150" rx="40" fill="#0a0b0c" stroke="#3a3c40" stroke-width="4"/>
<circle cx="600" cy="520" r="14" fill="url(#accent)"/>
<rect x="548" y="760" width="104" height="10" rx="5" fill="url(#accent)"/>
${shine(538, 340, 20, 560, 10)}`

const shaver = () => `
${shadow(600, 1080, 200)}
<path d="M450 420 Q450 380 490 380 H710 Q750 380 750 420 L740 950 Q738 1045 600 1045 Q462 1045 460 950 Z" fill="url(#body)"/>
<rect x="430" y="210" width="340" height="180" rx="42" fill="#1b1c1e"/>
<rect x="452" y="232" width="296" height="62" rx="31" fill="url(#metal)"/>
<rect x="452" y="306" width="296" height="62" rx="31" fill="url(#metal)"/>
${Array.from({ length: 21 }, (_, i) => `<line x1="${470 + i * 13}" y1="240" x2="${470 + i * 13}" y2="286" stroke="#55585d" stroke-width="2" opacity=".55"/><line x1="${470 + i * 13}" y1="314" x2="${470 + i * 13}" y2="360" stroke="#55585d" stroke-width="2" opacity=".55"/>`).join("")}
<circle cx="600" cy="610" r="46" fill="#0a0b0c" stroke="url(#accent)" stroke-width="7"/>
<path d="M600 586 v24" stroke="url(#accent)" stroke-width="7" stroke-linecap="round"/>
<rect x="540" y="800" width="120" height="10" rx="5" fill="#3a3c40"/>
${shine(478, 430, 26, 520, 13)}`

const scissors = () => `
${shadow(600, 1060, 260, 30)}
<g transform="rotate(-14 600 600)">
  <path d="M585 150 L632 150 L625 680 L592 680 Z" fill="url(#metal)"/>
  <path d="M592 680 L625 680 L640 780 Q700 800 700 880 Q700 965 620 965 Q540 965 540 885 Q540 815 592 790 Z M620 835 Q582 835 582 885 Q582 925 620 925 Q660 925 660 882 Q660 835 620 835 Z" fill="url(#bodyV)" fill-rule="evenodd"/>
</g>
<g transform="rotate(14 600 600)">
  <path d="M568 150 L615 150 L608 680 L575 680 Z" fill="url(#metal)"/>
  <path d="M575 680 L608 680 L608 790 Q660 815 660 885 Q660 965 580 965 Q500 965 500 880 Q500 800 560 780 Z M580 835 Q540 835 540 882 Q540 925 580 925 Q618 925 618 885 Q618 835 580 835 Z" fill="url(#bodyV)" fill-rule="evenodd"/>
</g>
<circle cx="600" cy="640" r="24" fill="url(#accent)" stroke="#2a2c2f" stroke-width="5"/>`

const comb = () => `
${shadow(600, 800, 420, 26)}
<rect x="170" y="470" width="860" height="92" rx="20" fill="url(#bodyV)"/>
${teeth(196, 556, 32, 14, 8, 170, "#141516")}
${teeth(650, 556, 24, 15.5, 11, 170, "#141516")}
<rect x="196" y="492" width="808" height="10" rx="5" fill="#fff" opacity=".12"/>
<rect x="540" y="512" width="120" height="8" rx="4" fill="url(#accent)"/>`

const jar = () => `
${shadow(600, 930, 300, 38)}
<path d="M330 590 H870 V820 Q870 880 810 880 H390 Q330 880 330 820 Z" fill="url(#body)"/>
<path d="M310 470 Q310 430 350 430 H850 Q890 430 890 470 V590 H310 Z" fill="url(#bodyV)"/>
<ellipse cx="600" cy="436" rx="270" ry="34" fill="#34363a"/>
<ellipse cx="600" cy="436" rx="170" ry="20" fill="none" stroke="url(#accent)" stroke-width="6"/>
<rect x="310" y="580" width="580" height="12" fill="#050506"/>
<rect x="430" y="690" width="340" height="96" rx="8" fill="none" stroke="url(#accent)" stroke-width="5"/>
<rect x="470" y="730" width="260" height="14" rx="7" fill="url(#accent)"/>
${shine(360, 610, 30, 230, 15, 0.12)}`

const dropper = () => `
${shadow(600, 1085, 180)}
<path d="M470 520 Q470 440 540 420 V380 H660 V420 Q730 440 730 520 V980 Q730 1050 660 1050 H540 Q470 1050 470 980 Z" fill="url(#glass)"/>
<rect x="528" y="290" width="144" height="100" rx="14" fill="url(#bodyV)"/>
<path d="M560 290 Q560 150 600 150 Q640 150 640 290 Z" fill="#17181a"/>
<rect x="500" y="640" width="200" height="250" rx="6" fill="#0d0e0f"/>
<rect x="528" y="690" width="144" height="12" rx="6" fill="url(#accent)"/>
<rect x="548" y="730" width="104" height="8" rx="4" fill="#57595d"/>
<rect x="548" y="760" width="104" height="8" rx="4" fill="#57595d"/>
${shine(492, 520, 22, 440, 11, 0.2)}`

const tube = () => `
${shadow(600, 1085, 170)}
<path d="M430 190 H770 L720 960 H480 Z" fill="url(#body)"/>
<rect x="420" y="150" width="360" height="48" rx="6" fill="#26282b"/>
${Array.from({ length: 22 }, (_, i) => `<line x1="${434 + i * 16}" y1="156" x2="${434 + i * 16}" y2="192" stroke="#0a0b0c" stroke-width="3"/>`).join("")}
<rect x="492" y="960" width="216" height="92" rx="12" fill="url(#bodyV)"/>
<rect x="500" y="430" width="200" height="14" rx="7" fill="url(#accent)"/>
<rect x="530" y="480" width="140" height="8" rx="4" fill="#5a5c60"/>
<rect x="530" y="510" width="140" height="8" rx="4" fill="#5a5c60"/>
<circle cx="600" cy="660" r="44" fill="none" stroke="url(#accent)" stroke-width="6"/>
${shine(470, 220, 22, 700, 11, 0.12)}`

const spray = () => `
${shadow(600, 1085, 170)}
<rect x="470" y="330" width="260" height="720" rx="26" fill="url(#body)"/>
<path d="M470 356 Q470 280 540 268 H660 Q730 280 730 356 Z" fill="url(#metal)"/>
<rect x="556" y="196" width="88" height="78" rx="10" fill="#1a1b1d"/>
<rect x="560" y="150" width="110" height="52" rx="12" fill="#242629"/>
<circle cx="658" cy="176" r="8" fill="#08090a"/>
<rect x="470" y="1010" width="260" height="16" fill="url(#metal)"/>
<rect x="510" y="560" width="180" height="14" rx="7" fill="url(#accent)"/>
<rect x="510" y="600" width="120" height="8" rx="4" fill="#5a5c60"/>
<rect x="510" y="760" width="180" height="150" rx="6" fill="none" stroke="#3a3c40" stroke-width="4"/>
${shine(494, 380, 24, 610, 12, 0.16)}`

const brush = () => `
${shadow(600, 1080, 200)}
<path d="M430 520 Q400 250 600 170 Q800 250 770 520 Z" fill="#d9d6cf"/>
${Array.from({ length: 16 }, (_, i) => `<path d="M${450 + i * 20} 518 Q${470 + i * 16} 330 ${520 + i * 10} 200" stroke="#8d8a83" stroke-width="3" fill="none" opacity=".5"/>`).join("")}
<path d="M430 500 Q600 560 770 500 V560 Q600 610 430 560 Z" fill="url(#metal)"/>
<path d="M468 570 Q600 610 732 570 Q700 720 720 860 Q740 1040 600 1050 Q460 1040 480 860 Q500 720 468 570 Z" fill="url(#body)"/>
<rect x="540" y="860" width="120" height="10" rx="5" fill="url(#accent)"/>
${shine(506, 640, 20, 340, 10, 0.14)}`

const razor = () => `
${shadow(600, 880, 400, 26)}
<g transform="rotate(-10 600 600)">
  <path d="M180 520 H690 Q700 520 700 532 V640 Q700 652 688 652 H250 Q180 652 180 590 Z" fill="url(#metalV)"/>
  <path d="M180 532 H690" stroke="#fff" stroke-width="5" opacity=".5"/>
  <path d="M690 560 H770 Q800 560 800 588 Q800 616 770 616 H690 Z" fill="url(#metal)"/>
</g>
<g transform="rotate(16 760 600)">
  <path d="M640 560 H1010 Q1060 560 1060 606 Q1060 652 1010 652 H640 Q610 652 610 606 Q610 560 640 560 Z" fill="url(#bodyV)"/>
  <circle cx="662" cy="606" r="12" fill="url(#accent)"/>
  <circle cx="1010" cy="606" r="10" fill="url(#accent)"/>
  <rect x="700" y="578" width="270" height="8" rx="4" fill="#fff" opacity=".12"/>
</g>`

const dryer = () => `
${shadow(620, 1085, 220)}
<path d="M640 560 H800 L770 1010 Q766 1050 720 1050 H690 Q650 1050 652 1010 Z" fill="url(#body)"/>
<path d="M300 300 Q300 200 400 200 H760 Q960 200 960 400 Q960 600 760 600 H400 Q300 600 300 500 Z" fill="url(#bodyV)"/>
<path d="M300 318 L190 290 Q170 286 170 306 V494 Q170 514 190 510 L300 482 Z" fill="#242629"/>
<rect x="170" y="300" width="22" height="200" rx="8" fill="url(#metalV)"/>
<circle cx="800" cy="400" r="120" fill="#0b0c0d"/>
${Array.from({ length: 7 }, (_, i) => `<line x1="${712 + i * 29}" y1="318" x2="${712 + i * 29}" y2="482" stroke="#3a3c40" stroke-width="6"/>`).join("")}
<circle cx="800" cy="400" r="120" fill="none" stroke="url(#accent)" stroke-width="7"/>
<rect x="684" y="700" width="60" height="110" rx="14" fill="#0a0b0c" stroke="#3a3c40" stroke-width="4"/>
<rect x="340" y="236" width="340" height="16" rx="8" fill="#fff" opacity=".13"/>`

const chair = () => `
${shadow(600, 1090, 330, 30)}
<rect x="410" y="1010" width="380" height="46" rx="23" fill="url(#metalV)"/>
<rect x="566" y="800" width="68" height="220" fill="url(#metal)"/>
<path d="M330 640 H870 Q900 640 900 670 V760 Q900 800 860 800 H340 Q300 800 300 760 V670 Q300 640 330 640 Z" fill="url(#bodyV)"/>
<path d="M360 170 Q360 130 400 130 H800 Q840 130 840 170 V620 H360 Z" fill="url(#body)"/>
<rect x="470" y="70" width="260" height="80" rx="30" fill="url(#bodyV)"/>
<rect x="250" y="520" width="90" height="40" rx="14" fill="#1a1b1d"/>
<rect x="860" y="520" width="90" height="40" rx="14" fill="#1a1b1d"/>
<rect x="270" y="556" width="34" height="130" fill="url(#metal)"/>
<rect x="896" y="556" width="34" height="130" fill="url(#metal)"/>
<path d="M420 800 L380 960 H820 L780 800 Z" fill="#141516"/>
<rect x="350" y="950" width="500" height="26" rx="10" fill="url(#metalV)"/>
${Array.from({ length: 4 }, (_, i) => `<line x1="400" y1="${250 + i * 100}" x2="800" y2="${250 + i * 100}" stroke="#000" stroke-width="5" opacity=".5"/>`).join("")}
<rect x="566" y="800" width="68" height="14" fill="url(#accent)"/>
${shine(390, 180, 22, 420, 11, 0.1)}`

const cape = () => `
${shadow(600, 1085, 330, 30)}
<path d="M520 180 Q600 250 680 180 L1010 980 Q1020 1050 950 1050 H250 Q180 1050 190 980 Z" fill="url(#bodyV)"/>
<path d="M520 180 Q600 250 680 180 L700 228 Q600 300 500 228 Z" fill="url(#metal)"/>
${Array.from({ length: 9 }, (_, i) => `<path d="M${560 + (i - 4) * 12} 270 L${330 + i * 68} 1040" stroke="#fff" stroke-width="5" opacity=".07"/>`).join("")}
<circle cx="600" cy="250" r="12" fill="url(#accent)"/>`

const mirror = () => `
${shadow(600, 1085, 190)}
<rect x="566" y="640" width="68" height="400" rx="30" fill="url(#body)"/>
<circle cx="600" cy="400" r="280" fill="url(#bodyV)"/>
<circle cx="600" cy="400" r="240" fill="url(#metal)"/>
<path d="M440 300 Q520 210 640 200" stroke="#fff" stroke-width="22" stroke-linecap="round" opacity=".5" fill="none"/>
<rect x="566" y="700" width="68" height="12" fill="url(#accent)"/>`

const caseBox = () => `
${shadow(600, 960, 400, 30)}
<path d="M480 360 V300 Q480 260 520 260 H680 Q720 260 720 300 V360" fill="none" stroke="url(#metal)" stroke-width="26"/>
<rect x="210" y="360" width="780" height="540" rx="34" fill="url(#bodyV)"/>
<rect x="210" y="600" width="780" height="12" fill="#050506"/>
<rect x="300" y="566" width="80" height="80" rx="10" fill="url(#metalV)"/>
<rect x="820" y="566" width="80" height="80" rx="10" fill="url(#metalV)"/>
<rect x="560" y="580" width="80" height="52" rx="8" fill="url(#accent)"/>
<rect x="210" y="360" width="60" height="60" rx="20" fill="url(#metal)"/>
<rect x="930" y="360" width="60" height="60" rx="20" fill="url(#metal)"/>
<rect x="210" y="840" width="60" height="60" rx="20" fill="url(#metal)"/>
<rect x="930" y="840" width="60" height="60" rx="20" fill="url(#metal)"/>
<rect x="290" y="400" width="620" height="12" rx="6" fill="#fff" opacity=".1"/>`

const guards = () => `
${shadow(600, 930, 380, 30)}
${[0, 1, 2, 3].map((i) => {
  const x = 190 + i * 215
  const h = 150 + i * 46
  return `<path d="M${x} 860 V${860 - h} Q${x} ${820 - h} ${x + 40} ${820 - h} H${x + 140} Q${x + 180} ${820 - h} ${x + 180} ${860 - h} V860 Z" fill="url(#body)"/>
${teeth(x + 14, 852, 10, 16, 8, 60 + i * 14, "#111213")}
<circle cx="${x + 90}" cy="${800 - h / 2}" r="24" fill="none" stroke="url(#accent)" stroke-width="5"/>`
}).join("")}`

const DRAWINGS = {
  clipper, trimmer, shaver, scissors, comb, jar, dropper, tube, spray, brush,
  razor, dryer, chair, cape, mirror, case: caseBox, guards,
}

/** Accent finishes. Each image is one drawing in one finish. */
const ACCENTS = { silver: "#c9cbd0", gold: "#c8a45c", copper: "#b8734a", red: "#b2382f", steel: "#7f8fa3" }

export const IMAGES = [
  ["clipper", "silver"], ["clipper", "gold"], ["clipper", "red"], ["clipper", "steel"],
  ["trimmer", "silver"], ["trimmer", "gold"], ["trimmer", "copper"],
  ["shaver", "silver"], ["shaver", "gold"], ["shaver", "steel"],
  ["scissors", "silver"], ["scissors", "gold"], ["scissors", "copper"],
  ["comb", "silver"], ["comb", "gold"],
  ["jar", "silver"], ["jar", "gold"], ["jar", "red"], ["jar", "copper"],
  ["dropper", "gold"], ["dropper", "silver"],
  ["tube", "silver"], ["tube", "red"],
  ["spray", "silver"], ["spray", "gold"],
  ["brush", "gold"], ["brush", "silver"],
  ["razor", "silver"], ["razor", "gold"],
  ["dryer", "silver"], ["dryer", "copper"],
  ["chair", "silver"], ["chair", "gold"],
  ["cape", "silver"], ["mirror", "gold"], ["case", "silver"], ["guards", "silver"],
]

const svg = (kind, accent) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${defs(ACCENTS[accent])}${DRAWINGS[kind]()}</svg>`

const files = []
for (const [kind, accent] of IMAGES) {
  const name = `${kind}-${accent}.webp`
  const buffer = await sharp(Buffer.from(svg(kind, accent)))
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer()
  writeFileSync(join(outDir, name), buffer)
  files.push({ name, kind, accent, buffer })
}
console.log(`Wrote ${files.length} images to ${outDir}`)

if (process.argv.includes("--sheet")) {
  const columns = 7
  const cell = 240
  const rows = Math.ceil(files.length / columns)
  const composites = await Promise.all(
    files.map(async (file, index) => ({
      input: await sharp(file.buffer).resize(cell - 16, cell - 16).png().toBuffer(),
      left: (index % columns) * cell + 8,
      top: Math.floor(index / columns) * cell + 8,
    }))
  )
  const sheetPath = process.argv[process.argv.indexOf("--sheet") + 1] || join(outDir, "contact-sheet.png")
  await sharp({
    create: { width: columns * cell, height: rows * cell, channels: 4, background: "#8a8b8d" },
  })
    .composite(composites)
    .png()
    .toFile(sheetPath)
  console.log(`Contact sheet: ${sheetPath}`)
}

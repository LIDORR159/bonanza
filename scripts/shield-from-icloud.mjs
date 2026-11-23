#!/usr/bin/env node
/**
 * Keeps the bulky generated folders out of iCloud Drive.
 *
 *   pnpm icloud:shield        (node scripts/shield-from-icloud.mjs)
 *
 * Only needed when this repository lives in a folder that iCloud syncs, such
 * as Desktop or Documents with "Desktop & Documents Folders" switched on.
 * iCloud then uploads every dependency file, and when the disk runs low it
 * removes local copies ("Optimise Mac Storage"). A removed file blocks any
 * program that reads it until it has been downloaded again, which shows up as
 * the dev servers, builds and tests hanging for no visible reason.
 *
 * iCloud skips anything whose name ends in `.nosync`. This script moves each
 * folder below to `<name>.nosync` and leaves a link under the original name,
 * so every tool keeps finding it where it expects:
 *
 *   node_modules/.pnpm          pnpm's package store: nearly all dependency files
 *   apps/storefront/.next       the storefront's build and dev cache
 *   apps/backend/node_modules/.vite   the admin dashboard's bundler cache
 *
 * `node_modules` itself stays a real folder: pnpm refuses to run when it is a
 * link. Run this again after anything deletes and recreates one of the
 * folders (a clean install, `next build`); it only touches what needs it.
 */
import { lstatSync, mkdirSync, renameSync, symlinkSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const targets = [
  "node_modules/.pnpm",
  "apps/storefront/.next",
  "apps/backend/node_modules/.vite",
]

const kind = (path) => {
  try {
    const stat = lstatSync(path)
    return stat.isSymbolicLink() ? "link" : stat.isDirectory() ? "directory" : "file"
  } catch {
    return "missing"
  }
}

let changed = 0
for (const target of targets) {
  const path = join(root, target)
  const shielded = `${path}.nosync`

  if (kind(path) === "link") {
    continue
  }
  if (kind(dirname(path)) !== "directory") {
    // Nothing installed here yet; run again after `pnpm install`.
    continue
  }
  if (kind(path) === "directory") {
    if (kind(shielded) !== "missing") {
      console.error(
        `Skipped ${target}: both it and ${target}.nosync exist. Delete the older one and run again.`
      )
      process.exitCode = 1
      continue
    }
    renameSync(path, shielded)
  } else if (kind(shielded) === "missing") {
    mkdirSync(shielded)
  }
  symlinkSync(`${basename(path)}.nosync`, path)
  console.log(`Shielded ${target}`)
  changed++
}

console.log(changed ? `Done: ${changed} folder(s) shielded.` : "Nothing to do: already shielded.")

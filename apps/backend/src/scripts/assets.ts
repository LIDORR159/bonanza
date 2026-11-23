import { existsSync, readFileSync } from "node:fs"
import { extname, join } from "node:path"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
}

/**
 * Uploads pictures from `seed-assets/` through Medusa's file module, so they
 * end up wherever uploads are configured to go (local disk, MinIO or R2).
 * Returns each path's public URL.
 *
 * A picture that is not on disk is skipped with a warning rather than failing
 * the seed: a production build holds the compiled scripts but only the assets
 * its image chose to copy.
 */
export async function uploadSeedAssets(
  container: MedusaContainer,
  paths: string[]
): Promise<Map<string, string>> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const found = paths.filter((path) => {
    const exists = existsSync(join(__dirname, "seed-assets", path))
    if (!exists) {
      logger.warn(`Seed picture ${path} is not on disk and was skipped.`)
    }
    return exists
  })
  if (!found.length) {
    return new Map()
  }

  const { result } = await uploadFilesWorkflow(container).run({
    input: {
      files: found.map((path) => ({
        filename: path.replace(/\//g, "-"),
        mimeType: MIME_TYPES[extname(path)] ?? "application/octet-stream",
        content: readFileSync(join(__dirname, "seed-assets", path)).toString("base64"),
        access: "public" as const,
      })),
    },
  })
  return new Map(found.map((path, index) => [path, result[index].url]))
}

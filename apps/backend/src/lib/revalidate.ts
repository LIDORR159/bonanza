import type { Logger } from "@medusajs/framework/types"

/**
 * Asks the storefront to refresh cached pages. Tags are collected for a short
 * moment and sent together, so a bulk product import becomes one request
 * instead of hundreds.
 *
 * Tag names are shared with the storefront (apps/storefront/lib/cache-tags.ts).
 */

export type CacheTag = "products" | "categories" | "collections" | "brands" | "cms"

const DEBOUNCE_MS = 1500
const pending = new Set<CacheTag>()
let timer: NodeJS.Timeout | null = null

async function flush(logger: Logger): Promise<void> {
  const tags = Array.from(pending)
  pending.clear()
  timer = null

  const secret = process.env.REVALIDATE_SECRET
  // Inside Docker the storefront is reached by its service name, not its public URL.
  const base = (
    process.env.STOREFRONT_INTERNAL_URL ||
    process.env.STOREFRONT_URL ||
    ""
  ).replace(/\/$/, "")
  if (!secret || !base || !tags.length) {
    return
  }

  try {
    const response = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        // Some edge networks reject requests that carry a default library agent.
        "user-agent": "bonanza-backend/1.0",
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      logger.warn(`Storefront revalidation answered ${response.status} for [${tags}]`)
    }
  } catch (error) {
    // The storefront also refreshes on a timer, so a missed call only delays
    // the update. It must never fail the admin action that caused it.
    logger.warn(`Storefront revalidation failed for [${tags}]: ${(error as Error).message}`)
  }
}

export function requestRevalidation(logger: Logger, ...tags: CacheTag[]): void {
  for (const tag of tags) {
    pending.add(tag)
  }
  timer ??= setTimeout(() => void flush(logger), DEBOUNCE_MS)
}

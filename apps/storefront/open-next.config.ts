import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue"
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"

/**
 * How the storefront runs on Cloudflare Workers (`pnpm cf:build`). The default
 * deployment is the Docker image; this target is kept buildable so a later
 * move is a configuration change, not a rewrite. See docs/cloudflare-deployment.md.
 *
 * - Rendered pages are cached in an R2 bucket.
 * - Cache tags live in a D1 database, so the backend's "content changed"
 *   call (`/api/revalidate`) reaches every Worker instance.
 * - Background refreshes are de-duplicated in memory, which needs no further
 *   Cloudflare product.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
})

/**
 * Tags on cached backend responses. The backend names the same tags when it
 * asks for a refresh (apps/backend/src/lib/revalidate.ts).
 */
export const CACHE_TAGS = [
  "products",
  "categories",
  "collections",
  "brands",
  "cms",
] as const
export type CacheTag = (typeof CACHE_TAGS)[number]

export const isCacheTag = (value: unknown): value is CacheTag =>
  typeof value === "string" && (CACHE_TAGS as readonly string[]).includes(value)

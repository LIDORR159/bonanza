/**
 * Fixed choice lists for the content screens. They mirror the enums in
 * src/modules/cms/constants.ts; the API rejects anything else.
 */
export const SECTION_TYPES = [
  "hero",
  "categories",
  "product_rail",
  "banner_slot",
  "brands",
  "academy",
  "editorial",
  "newsletter",
] as const

export const PRODUCT_SOURCES = ["newest", "on_sale", "tag", "category", "collection", "brand"] as const

export const BANNER_PLACEMENTS = [
  "home_primary",
  "home_secondary",
  "catalog_top",
  "announcement",
] as const

export const NAVIGATION_MENUS = ["header", "footer"] as const
export const LINK_TYPES = ["custom", "category", "page", "brand"] as const

/** Published now, published later, or not published. */
export function publishState(record: Record<string, any>): "draft" | "published" | "scheduled" {
  if (record.status !== "published") {
    return "draft"
  }
  return record.publish_at && new Date(record.publish_at) > new Date() ? "scheduled" : "published"
}

export const STATE_COLOR = { draft: "grey", published: "green", scheduled: "orange" } as const

/** Keeps only the named keys: the API refuses fields it does not know. */
export function pick(values: Record<string, any>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]))
}

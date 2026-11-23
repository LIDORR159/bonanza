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
  "info_strip",
  "about",
  "pricing",
  "gallery",
  "reviews",
] as const

export const PRODUCT_SOURCES = ["newest", "on_sale", "tag", "category", "collection", "brand"] as const

export const BANNER_PLACEMENTS = [
  "home_primary",
  "home_secondary",
  "catalog_top",
  "announcement",
] as const

export const REVIEW_SOURCES = ["google", "other"] as const

export const NAVIGATION_MENUS = ["header", "footer"] as const
export const LINK_TYPES = ["custom", "category", "page", "brand"] as const

/** Published now, published later, or not published. */
export function publishState(record: Record<string, any>): "draft" | "published" | "scheduled" {
  if (record.status !== "published") {
    return "draft"
  }
  return record.publish_at && new Date(record.publish_at) > new Date() ? "scheduled" : "published"
}

/** The draft / published choice of a record that has no schedule. */
export const statusOptions = (t: (key: string) => string) => [
  { value: "draft", label: t("bonanza.common.draft") },
  { value: "published", label: t("bonanza.common.published") },
]

/** The rank that puts a new record after the ones already listed. */
export const nextRank = (rows: Record<string, any>[]): number =>
  rows.reduce((highest, row) => Math.max(highest, Number(row.rank) || 0), -10) + 10

export const STATE_COLOR = { draft: "grey", published: "green", scheduled: "orange" } as const

/** Keeps only the named keys: the API refuses fields it does not know. */
export function pick(values: Record<string, any>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]))
}

/**
 * The fields to send when saving. `rank` goes out only with a new record, to
 * place it last; an existing record's order is changed by the move buttons.
 */
export function forSave(values: Record<string, any>, keys: readonly string[]) {
  const data = pick(values, keys)
  if (values.id) {
    delete data.rank
  }
  return data
}

/**
 * The content records that share one save / delete / reorder implementation.
 * `singular` and `plural` are the suffixes of the generated service methods:
 * `retrieveBanner`, `createBanners`, `softDeleteBanners`, and so on.
 */
export const CMS_ENTITIES = {
  homepage_section: { singular: "HomepageSection", plural: "HomepageSections" },
  banner: { singular: "Banner", plural: "Banners" },
  content_page: { singular: "ContentPage", plural: "ContentPages" },
  navigation_item: { singular: "NavigationItem", plural: "NavigationItems" },
  site_setting: { singular: "SiteSetting", plural: "SiteSettings" },
  service_group: { singular: "ServiceGroup", plural: "ServiceGroups" },
  service_item: { singular: "ServiceItem", plural: "ServiceItems" },
  gallery_item: { singular: "GalleryItem", plural: "GalleryItems" },
  team_member: { singular: "TeamMember", plural: "TeamMembers" },
  review: { singular: "Review", plural: "Reviews" },
} as const

export type CmsEntity = keyof typeof CMS_ENTITIES

/** The event the storefront cache refresh listens to. */
export const CMS_CHANGED_EVENT = "cms.changed"

/**
 * The fields, in order of preference, that name a record in the activity log.
 * Whichever the record has first is used.
 */
const SUMMARY_FIELDS = [
  "title",
  "label",
  "key",
  "store_name",
  "name",
  "author_name",
  "caption",
  "alt",
] as const

/** A short human name for a record, or null when it has none. */
export function summaryOf(record: Record<string, unknown>): string | null {
  for (const field of SUMMARY_FIELDS) {
    const value = record[field]
    if (typeof value === "string" && value) {
      return value
    }
  }
  return null
}

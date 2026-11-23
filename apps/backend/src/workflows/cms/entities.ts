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
} as const

export type CmsEntity = keyof typeof CMS_ENTITIES

/** The event the storefront cache refresh listens to. */
export const CMS_CHANGED_EVENT = "cms.changed"

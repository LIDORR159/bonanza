import type {
  BannerPlacement,
  HomepageSectionType,
  NavigationLinkType,
  NavigationMenu,
  ProductSourceType,
  PublishStatus,
  ReviewSource,
  SiteLocale,
} from "@bonanza/types"

/**
 * Runtime lists of the content enums. `@bonanza/types` is types-only, so the
 * values live here; `Exhaustive` fails the build if a list and its union drift.
 */
type Exhaustive<List extends readonly string[], Union extends string> = [
  Union,
] extends [List[number]]
  ? List
  : never

const exhaustive =
  <Union extends string>() =>
  <const List extends readonly Union[]>(list: Exhaustive<List, Union>) =>
    list

export const PUBLISH_STATUSES = exhaustive<PublishStatus>()(["draft", "published"])

export const HOMEPAGE_SECTION_TYPES = exhaustive<HomepageSectionType>()([
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
])

export const PRODUCT_SOURCE_TYPES = exhaustive<ProductSourceType>()([
  "collection",
  "category",
  "tag",
  "brand",
  "newest",
  "on_sale",
])

export const BANNER_PLACEMENTS = exhaustive<BannerPlacement>()([
  "home_primary",
  "home_secondary",
  "catalog_top",
  "announcement",
])

export const NAVIGATION_MENUS = exhaustive<NavigationMenu>()(["header", "footer"])

export const NAVIGATION_LINK_TYPES = exhaustive<NavigationLinkType>()([
  "custom",
  "category",
  "page",
  "brand",
])

export const NEWSLETTER_STATUSES = ["subscribed", "unsubscribed"] as const

export const REVIEW_SOURCES = exhaustive<ReviewSource>()(["google", "other"])

/**
 * The storefront's languages. Content is written in Hebrew, which is what the
 * records themselves hold. The other languages are stored as translations
 * (Medusa's Translation Module) under these same codes, so the storefront
 * sends its own language code in `x-medusa-locale` and gets Hebrew wherever a
 * translation is missing.
 */
export const SITE_LOCALES = exhaustive<SiteLocale>()(["he", "en", "ar"])
export const DEFAULT_LOCALE: SiteLocale = "he"

/** The languages content is translated into, with the names the admin shows. */
export const TRANSLATION_LOCALES: { code: Exclude<SiteLocale, "he">; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic (العربية)" },
]

/**
 * Storefront paths a content page slug may not take, because a storefront
 * route already lives there.
 */
export const RESERVED_PAGE_SLUGS = [
  "account",
  "api",
  "app",
  "brands",
  "cart",
  "categories",
  "checkout",
  "collections",
  "gallery",
  "order",
  "products",
  "search",
  "static",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
] as const

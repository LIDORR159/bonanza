/**
 * The content contract between the Medusa backend (`/store/cms/*`, `/store/brands`)
 * and the storefront.
 *
 * Types only: this package has no runtime output, so import it with `import type`.
 * Each app keeps its own runtime lists of these values and checks them against
 * the unions here.
 */

export type PublishStatus = "draft" | "published"

// ── Homepage ────────────────────────────────────────────────────────────────

export type HomepageSectionType =
  | "hero"
  | "categories"
  | "product_rail"
  | "banner_slot"
  | "brands"
  | "academy"
  | "editorial"
  | "newsletter"

/** Where a product rail takes its products from. */
export type ProductSource =
  | { type: "collection"; id: string }
  | { type: "category"; id: string }
  | { type: "tag"; id: string }
  | { type: "brand"; id: string }
  | { type: "newest" }
  | { type: "on_sale" }

export type ProductSourceType = ProductSource["type"]

export interface HomepageSectionSettings {
  /** `product_rail` only. */
  product_source?: ProductSource
  /** `product_rail`, `categories`, `brands`: how many items to show. */
  limit?: number
  /** `banner_slot` only: which banner placement this slot renders. */
  banner_placement?: BannerPlacement
}

export interface CallToAction {
  label: string
  url: string
}

export interface StoreHomepageSection {
  id: string
  type: HomepageSectionType
  /** Stable handle, e.g. `best-sellers`. Used for anchors and analytics. */
  key: string
  title: string | null
  subtitle: string | null
  body: string | null
  image_url: string | null
  mobile_image_url: string | null
  image_alt: string | null
  cta: CallToAction | null
  secondary_cta: CallToAction | null
  settings: HomepageSectionSettings
}

// ── Banners ─────────────────────────────────────────────────────────────────

export type BannerPlacement =
  | "home_primary"
  | "home_secondary"
  | "catalog_top"
  | "announcement"

export interface StoreBanner {
  id: string
  placement: BannerPlacement
  title: string
  subtitle: string | null
  image_url: string | null
  mobile_image_url: string | null
  image_alt: string | null
  target_url: string | null
  cta_label: string | null
}

// ── Content pages and SEO ───────────────────────────────────────────────────

export interface SeoFields {
  meta_title: string | null
  meta_description: string | null
  canonical_url: string | null
  og_image_url: string | null
  include_in_sitemap: boolean
}

export interface StoreContentPage {
  id: string
  slug: string
  title: string
  /** Markdown. */
  body: string
  seo: SeoFields
  updated_at: string
  /** True when served through a preview token and not yet public. */
  is_preview?: boolean
}

export interface StoreContentPageSummary {
  slug: string
  title: string
  include_in_sitemap: boolean
  updated_at: string
}

// ── Navigation ──────────────────────────────────────────────────────────────

export type NavigationMenu = "header" | "footer"

export type NavigationLinkType = "custom" | "category" | "page" | "brand"

export interface StoreNavigationItem {
  id: string
  label: string
  /** Storefront-relative path or absolute URL, already resolved. */
  url: string
  link_type: NavigationLinkType
  open_in_new_tab: boolean
  children: StoreNavigationItem[]
}

export type StoreNavigation = Record<NavigationMenu, StoreNavigationItem[]>

// ── Site settings ───────────────────────────────────────────────────────────

export interface StoreSiteSettings {
  store_name: string
  tagline: string | null
  /** e.g. `%s | BONANZA`. `%s` is replaced by the page title. */
  title_template: string
  default_meta_title: string
  default_meta_description: string | null
  default_og_image_url: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  contact_email: string | null
  address: string | null
  opening_hours: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  youtube_url: string | null
  newsletter_enabled: boolean
  /** Order subtotal, in ILS, above which shipping is advertised as free. Display only. */
  free_shipping_threshold: number | null
}

// ── Brands ──────────────────────────────────────────────────────────────────

export interface StoreBrand {
  id: string
  name: string
  handle: string
  logo_url: string | null
  description: string | null
  is_featured: boolean
}

// ── Product SEO stored in Medusa `metadata` ─────────────────────────────────

/** Keys the admin SEO widget writes into a product's or category's `metadata`. */
export interface SeoMetadata {
  seo_title?: string
  seo_description?: string
  seo_og_image?: string
  /** "true" to leave the page out of the sitemap. Metadata values are strings. */
  seo_exclude_from_sitemap?: string
}

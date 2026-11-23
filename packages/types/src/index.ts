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
  /** Opening hours, address and phone in one thin strip under the hero. */
  | "info_strip"
  /** The shop's story beside a photograph. */
  | "about"
  /** The service price list (`/store/cms/services`). */
  | "pricing"
  /** A few featured works, linking to the gallery page. */
  | "gallery"
  /** Customer reviews (`/store/cms/reviews`). */
  | "reviews"

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
  /**
   * One row per line, written `days | hours`, for example
   * `Sunday–Thursday | 09:00–20:00`. A line without `|` is shown as a note.
   */
  opening_hours: string | null
  /** Where "book an appointment" buttons lead (an external booking page). */
  booking_url: string | null
  /** `src` of a Google Maps embed for the footer map. */
  map_embed_url: string | null
  /** Link that opens the location in a maps app. */
  map_link_url: string | null
  google_reviews_url: string | null
  google_rating: number | null
  google_review_count: number | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  youtube_url: string | null
  newsletter_enabled: boolean
  /** Order subtotal, in ILS, above which shipping is advertised as free. Display only. */
  free_shipping_threshold: number | null
}

// ── Locales ─────────────────────────────────────────────────────────────────

/** Storefront languages. Hebrew is the default and has no URL prefix. */
export type SiteLocale = "he" | "en" | "ar"

// ── Services and prices ─────────────────────────────────────────────────────

export interface StoreServiceItem {
  id: string
  name: string
  /** One short line under the name. */
  description: string | null
  /** Whole shekels, VAT included. Null shows `price_note` alone. */
  price: number | null
  /** Shown before the price ("from") or instead of it ("by quote"). */
  price_note: string | null
  duration_minutes: number | null
}

/** One card of the price list, e.g. haircuts, beard, packages. */
export interface StoreServiceGroup {
  id: string
  title: string
  note: string | null
  items: StoreServiceItem[]
}

// ── Gallery and team ────────────────────────────────────────────────────────

export interface StoreGalleryItem {
  id: string
  image_url: string
  alt: string | null
  caption: string | null
  /** Featured items are the ones the home page shows. */
  is_featured: boolean
}

export interface StoreTeamMember {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  instagram_url: string | null
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export type ReviewSource = "google" | "other"

export interface StoreReview {
  id: string
  author_name: string
  /** 1 to 5. */
  rating: number
  text: string
  /** Free text such as "a month ago"; reviews are entered by hand. */
  date_label: string | null
  source: ReviewSource
}

/** The overall score shown above the review cards. Entered in site settings. */
export interface StoreReviewSummary {
  rating: number | null
  count: number | null
  /** The business's public reviews page. */
  url: string | null
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

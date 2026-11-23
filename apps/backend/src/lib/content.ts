import type {
  HomepageSectionSettings,
  StoreBanner,
  StoreBrand,
  StoreContentPage,
  StoreContentPageSummary,
  StoreHomepageSection,
  StoreNavigationItem,
  StoreSiteSettings,
} from "@bonanza/types"

/**
 * Publication rules and the mapping from stored records to what the storefront
 * receives. Kept in one place so the Store API and its tests agree.
 */

type Publishable = { status: string; publish_at?: Date | string | null }

/** Published, and past its scheduled time if it has one. */
export function isLive(record: Publishable, now: Date = new Date()): boolean {
  if (record.status !== "published") {
    return false
  }
  return !record.publish_at || new Date(record.publish_at) <= now
}

type Schedulable = {
  is_enabled: boolean
  starts_at?: Date | string | null
  ends_at?: Date | string | null
}

/** Enabled, and inside its start/end window if it has one. */
export function isBannerActive(banner: Schedulable, now: Date = new Date()): boolean {
  if (!banner.is_enabled) {
    return false
  }
  if (banner.starts_at && new Date(banner.starts_at) > now) {
    return false
  }
  if (banner.ends_at && new Date(banner.ends_at) <= now) {
    return false
  }
  return true
}

const cta = (label?: string | null, url?: string | null) =>
  label && url ? { label, url } : null

const iso = (value: Date | string) => new Date(value).toISOString()

type Row = Record<string, any>

export const toStoreSection = (section: Row): StoreHomepageSection => ({
  id: section.id,
  type: section.type,
  key: section.key,
  title: section.title ?? null,
  subtitle: section.subtitle ?? null,
  body: section.body ?? null,
  image_url: section.image_url ?? null,
  mobile_image_url: section.mobile_image_url ?? null,
  image_alt: section.image_alt ?? null,
  cta: cta(section.cta_label, section.cta_url),
  secondary_cta: cta(section.secondary_cta_label, section.secondary_cta_url),
  settings: (section.settings ?? {}) as HomepageSectionSettings,
})

export const toStoreBanner = (banner: Row): StoreBanner => ({
  id: banner.id,
  placement: banner.placement,
  title: banner.title,
  subtitle: banner.subtitle ?? null,
  image_url: banner.image_url ?? null,
  mobile_image_url: banner.mobile_image_url ?? null,
  image_alt: banner.image_alt ?? null,
  target_url: banner.target_url ?? null,
  cta_label: banner.cta_label ?? null,
})

export const toStorePage = (page: Row, isPreview = false): StoreContentPage => ({
  id: page.id,
  slug: page.slug,
  title: page.title,
  body: page.body ?? "",
  seo: {
    meta_title: page.meta_title ?? null,
    meta_description: page.meta_description ?? null,
    canonical_url: page.canonical_url ?? null,
    og_image_url: page.og_image_url ?? null,
    include_in_sitemap: page.include_in_sitemap,
  },
  updated_at: iso(page.updated_at),
  ...(isPreview ? { is_preview: true } : {}),
})

export const toStorePageSummary = (page: Row): StoreContentPageSummary => ({
  slug: page.slug,
  title: page.title,
  include_in_sitemap: page.include_in_sitemap,
  updated_at: iso(page.updated_at),
})

/**
 * The storefront path a menu entry points to. This is the one place that
 * knows the storefront's URL scheme for categories, pages and brands.
 */
export function resolveNavigationUrl(item: Row): string {
  switch (item.link_type) {
    case "category":
      return `/categories/${item.link_ref}`
    case "brand":
      return `/brands/${item.link_ref}`
    case "page":
      return `/${item.link_ref}`
    default:
      return item.url || "/"
  }
}

/** Nests child entries under their parents. Hidden parents hide their children. */
export function toNavigationTree(items: Row[]): StoreNavigationItem[] {
  const visible = items.filter((item) => item.is_visible)
  const byParent = new Map<string | null, Row[]>()
  for (const item of visible) {
    const key = item.parent_id ?? null
    byParent.set(key, [...(byParent.get(key) ?? []), item])
  }
  const build = (parentId: string | null, depth: number): StoreNavigationItem[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({
        id: item.id,
        label: item.label,
        url: resolveNavigationUrl(item),
        link_type: item.link_type,
        open_in_new_tab: item.open_in_new_tab,
        // One level of nesting only.
        children: depth === 0 ? build(item.id, 1) : [],
      }))
  return build(null, 0)
}

export const toStoreSettings = (settings: Row): StoreSiteSettings => ({
  store_name: settings.store_name,
  tagline: settings.tagline ?? null,
  title_template: settings.title_template,
  default_meta_title: settings.default_meta_title,
  default_meta_description: settings.default_meta_description ?? null,
  default_og_image_url: settings.default_og_image_url ?? null,
  contact_phone: settings.contact_phone ?? null,
  contact_whatsapp: settings.contact_whatsapp ?? null,
  contact_email: settings.contact_email ?? null,
  address: settings.address ?? null,
  opening_hours: settings.opening_hours ?? null,
  instagram_url: settings.instagram_url ?? null,
  facebook_url: settings.facebook_url ?? null,
  tiktok_url: settings.tiktok_url ?? null,
  youtube_url: settings.youtube_url ?? null,
  newsletter_enabled: settings.newsletter_enabled,
  free_shipping_threshold: settings.free_shipping_threshold ?? null,
})

export const toStoreBrand = (brand: Row): StoreBrand => ({
  id: brand.id,
  name: brand.name,
  handle: brand.handle,
  logo_url: brand.logo_url ?? null,
  description: brand.description ?? null,
  is_featured: brand.is_featured,
})

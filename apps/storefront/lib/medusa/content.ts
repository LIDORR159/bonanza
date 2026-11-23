import "server-only"
import type {
  BannerPlacement,
  StoreBanner,
  StoreBrand,
  StoreContentPage,
  StoreContentPageSummary,
  StoreHomepageSection,
  StoreNavigation,
  StoreSiteSettings,
} from "@bonanza/types"
import { cookies, draftMode } from "next/headers"
import { cachedFetch, privateFetch } from "./client"

/**
 * Site content managed in the admin: home page, banners, pages, menus,
 * settings and brands.
 *
 * Every reader falls back to an empty value when the backend cannot be
 * reached, so a backend restart shows a thinner page instead of an error.
 */

export const PREVIEW_COOKIE = "bnz_preview"

/**
 * The preview token, when a member of staff has opened a preview link. Its
 * presence makes the content readers ask for drafts and skip the cache.
 */
async function previewToken(): Promise<string | null> {
  try {
    if (!(await draftMode()).isEnabled) {
      return null
    }
    return (await cookies()).get(PREVIEW_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

async function read<T>(path: string, query?: Record<string, unknown>): Promise<T> {
  const token = await previewToken()
  if (token) {
    return privateFetch<T>(path, { query, headers: { "x-cms-preview-token": token } })
  }
  return cachedFetch<T>(path, { query, tags: ["cms"] })
}

export async function isPreviewing(): Promise<boolean> {
  return (await previewToken()) !== null
}

export async function getHomepageSections(): Promise<StoreHomepageSection[]> {
  try {
    return (await read<{ sections: StoreHomepageSection[] }>("/store/cms/homepage")).sections
  } catch {
    return []
  }
}

export async function getBanners(placement: BannerPlacement): Promise<StoreBanner[]> {
  try {
    return (await read<{ banners: StoreBanner[] }>("/store/cms/banners", { placement })).banners
  } catch {
    return []
  }
}

/** A published page, or a draft when previewing. Null when there is none. */
export async function getPage(slug: string): Promise<StoreContentPage | null> {
  try {
    return (
      await read<{ page: StoreContentPage }>(`/store/cms/pages/${encodeURIComponent(slug)}`)
    ).page
  } catch {
    return null
  }
}

export async function listPages(): Promise<StoreContentPageSummary[]> {
  try {
    return (
      await cachedFetch<{ pages: StoreContentPageSummary[] }>("/store/cms/pages", {
        tags: ["cms"],
      })
    ).pages
  } catch {
    return []
  }
}

const EMPTY_NAVIGATION: StoreNavigation = { header: [], footer: [] }

export async function getNavigation(): Promise<StoreNavigation> {
  try {
    return (
      await cachedFetch<{ navigation: StoreNavigation }>("/store/cms/navigation", {
        tags: ["cms"],
      })
    ).navigation
  } catch {
    return EMPTY_NAVIGATION
  }
}

const DEFAULT_SETTINGS: StoreSiteSettings = {
  store_name: "BONANZA",
  tagline: "BARBERSHOP & ACADEMY",
  title_template: "%s | BONANZA",
  default_meta_title: "BONANZA",
  default_meta_description: null,
  default_og_image_url: null,
  contact_phone: null,
  contact_whatsapp: null,
  contact_email: null,
  address: null,
  opening_hours: null,
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  youtube_url: null,
  newsletter_enabled: false,
  free_shipping_threshold: null,
}

export async function getSettings(): Promise<StoreSiteSettings> {
  try {
    return (
      await cachedFetch<{ settings: StoreSiteSettings }>("/store/cms/settings", {
        tags: ["cms"],
      })
    ).settings
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function listBrands(options: { featured?: boolean } = {}): Promise<StoreBrand[]> {
  try {
    return (
      await cachedFetch<{ brands: StoreBrand[] }>("/store/brands", {
        query: options.featured ? { featured: "true" } : undefined,
        tags: ["brands"],
      })
    ).brands
  } catch {
    return []
  }
}

export async function getBrand(handle: string): Promise<StoreBrand | null> {
  try {
    return (
      await cachedFetch<{ brand: StoreBrand }>(`/store/brands/${encodeURIComponent(handle)}`, {
        tags: ["brands"],
      })
    ).brand
  } catch {
    return null
  }
}

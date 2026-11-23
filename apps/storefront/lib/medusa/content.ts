import "server-only"
import type {
  BannerPlacement,
  StoreBanner,
  StoreBrand,
  StoreContentPage,
  StoreContentPageSummary,
  StoreGalleryItem,
  StoreHomepageSection,
  StoreNavigation,
  StoreReview,
  StoreReviewSummary,
  StoreServiceGroup,
  StoreSiteSettings,
  StoreTeamMember,
} from "@bonanza/types"
import { cookies, draftMode } from "next/headers"
import { cachedFetch, localeRequest, privateFetch } from "./client"

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
    const language = localeRequest()
    return privateFetch<T>(path, {
      query: { ...query, ...language.query },
      headers: { ...language.headers, "x-cms-preview-token": token },
    })
  }
  return cachedFetch<T>(path, { query, tags: ["cms"] })
}

export async function isPreviewing(): Promise<boolean> {
  return (await previewToken()) !== null
}

export async function getHomepageSections(): Promise<StoreHomepageSection[]> {
  try {
    return (await read<{ sections: StoreHomepageSection[] }>("/store/cms/homepage"))
      .sections
  } catch {
    return []
  }
}

/** The price list: groups of services, in the order set in the admin. */
export async function getServiceGroups(): Promise<StoreServiceGroup[]> {
  try {
    return (await read<{ service_groups: StoreServiceGroup[] }>("/store/cms/services"))
      .service_groups
  } catch {
    return []
  }
}

export async function getGalleryItems(
  options: { featured?: boolean; limit?: number } = {}
): Promise<StoreGalleryItem[]> {
  try {
    return (
      await read<{ gallery_items: StoreGalleryItem[] }>("/store/cms/gallery", {
        featured: options.featured ? "true" : undefined,
        limit: options.limit,
      })
    ).gallery_items
  } catch {
    return []
  }
}

export async function getTeamMembers(): Promise<StoreTeamMember[]> {
  try {
    return (await read<{ team_members: StoreTeamMember[] }>("/store/cms/team"))
      .team_members
  } catch {
    return []
  }
}

const NO_REVIEWS: { reviews: StoreReview[]; summary: StoreReviewSummary } = {
  reviews: [],
  summary: { rating: null, count: null, url: null },
}

/** Reviews entered in the admin, with the overall score from site settings. */
export async function getReviews(limit = 6): Promise<typeof NO_REVIEWS> {
  try {
    return await read<typeof NO_REVIEWS>("/store/cms/reviews", { limit })
  } catch {
    return NO_REVIEWS
  }
}

export async function getBanners(placement: BannerPlacement): Promise<StoreBanner[]> {
  try {
    return (await read<{ banners: StoreBanner[] }>("/store/cms/banners", { placement }))
      .banners
  } catch {
    return []
  }
}

/** A published page, or a draft when previewing. Null when there is none. */
export async function getPage(slug: string): Promise<StoreContentPage | null> {
  try {
    return (
      await read<{ page: StoreContentPage }>(
        `/store/cms/pages/${encodeURIComponent(slug)}`
      )
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
  booking_url: null,
  map_embed_url: null,
  map_link_url: null,
  google_reviews_url: null,
  google_rating: null,
  google_review_count: null,
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

export async function listBrands(
  options: { featured?: boolean } = {}
): Promise<StoreBrand[]> {
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
      await cachedFetch<{ brand: StoreBrand }>(
        `/store/brands/${encodeURIComponent(handle)}`,
        {
          tags: ["brands"],
        }
      )
    ).brand
  } catch {
    return null
  }
}

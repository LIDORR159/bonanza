/**
 * Runtime configuration, read from the environment in one place.
 */

const trimSlash = (url: string) => url.replace(/\/$/, "")

/** Public address of this storefront. Used for canonical links and the sitemap. */
export const SITE_URL = trimSlash(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8000")

/** Medusa backend, as reached from the storefront server. */
export const BACKEND_URL = trimSlash(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000")

export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/** The store sells in one region, identified by this country. */
export const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "il").toLowerCase()

export const CURRENCY = "ILS"

/** False on temporary URLs so search engines do not index them. */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"

export const IS_PRODUCTION = process.env.NODE_ENV === "production"

/** Languages the storefront is written in. The first one has no URL prefix. */
export const LOCALES = ["he"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "he"

export const LOCALE_SETTINGS: Record<Locale, { dir: "rtl" | "ltr"; intl: string; medusa: string }> = {
  he: { dir: "rtl", intl: "he-IL", medusa: "he-IL" },
}

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value)

/** How long cached catalog and content pages are served before a background refresh. */
export const REVALIDATE_SECONDS = 300

export const CATALOG_PAGE_SIZE = 12

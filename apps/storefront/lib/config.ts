/**
 * Runtime configuration, read from the environment in one place.
 *
 * None of these use the NEXT_PUBLIC_ prefix on purpose. They are only read on
 * the server, and a NEXT_PUBLIC_ value is baked into the build: without the
 * prefix the same built image runs unchanged in staging and production.
 */

const trimSlash = (url: string) => url.replace(/\/$/, "")

/** Public address of this storefront. Used for canonical links and the sitemap. */
export const SITE_URL = trimSlash(process.env.SITE_URL || "http://localhost:8000")

/** Medusa backend, as reached from the storefront server. */
export const BACKEND_URL = trimSlash(
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
)

export const PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || ""

/** The store sells in one region, identified by this country. */
export const DEFAULT_COUNTRY = (process.env.DEFAULT_COUNTRY || "il").toLowerCase()

export const CURRENCY = "ILS"

/** False on temporary URLs so search engines do not index them. */
export const ALLOW_INDEXING = process.env.ALLOW_INDEXING === "true"

export const IS_PRODUCTION = process.env.NODE_ENV === "production"

/**
 * Languages the storefront is written in. Hebrew is the default and has no URL
 * prefix (`/products`); the others are prefixed (`/en/products`).
 */
export const LOCALES = ["he", "en", "ar"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "he"

export const LOCALE_SETTINGS: Record<
  Locale,
  {
    dir: "rtl" | "ltr"
    /** For dates and numbers. */
    intl: string
    /** The backend's code for this language. It must match exactly: `en`, not `en-US`. */
    medusa: string
    /** Open Graph form. */
    og: string
    /** The language's own name, and the short form shown in the header. */
    label: string
    short: string
  }
> = {
  he: {
    dir: "rtl",
    intl: "he-IL",
    medusa: "he",
    og: "he_IL",
    label: "עברית",
    short: "עב",
  },
  en: {
    dir: "ltr",
    intl: "en-IL",
    medusa: "en",
    og: "en_US",
    label: "English",
    short: "EN",
  },
  ar: {
    dir: "rtl",
    intl: "ar-IL",
    medusa: "ar",
    og: "ar_IL",
    label: "العربية",
    short: "ع",
  },
}

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value)

/** Remembers the visitor's language for form submissions and return pages. */
export const LOCALE_COOKIE = "bnz_locale"

/** How long cached catalog and content pages are served before a background refresh. */
export const REVALIDATE_SECONDS = 300

export const CATALOG_PAGE_SIZE = 12

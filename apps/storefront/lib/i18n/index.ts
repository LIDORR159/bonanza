import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "../config"
import { ar } from "./ar"
import { en } from "./en"
import { he, type Dictionary } from "./he"

export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { he, en, ar }

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? he
}

const isInternal = (href: string) => href.startsWith("/") && !href.startsWith("//")

/**
 * A storefront path in the given language: `/products` stays as it is in
 * Hebrew and becomes `/en/products` in English. External links, anchors and
 * `mailto:`/`tel:` are returned untouched.
 */
export function localePath(locale: Locale, href: string): string {
  if (locale === DEFAULT_LOCALE || !isInternal(href)) {
    return href
  }
  const { rest } = splitLocale(href)
  const afterHome = rest.startsWith("/#") || rest.startsWith("/?") ? rest.slice(1) : rest
  return afterHome === "/" ? `/${locale}` : `/${locale}${afterHome}`
}

/** `/en/products?x=1` → `{ locale: "en", rest: "/products?x=1" }`. */
export function splitLocale(href: string): { locale: Locale; rest: string } {
  const match = /^\/([a-z]{2})(?=\/|$|\?|#)(.*)$/.exec(href)
  const [, prefix, rest = ""] = match ?? []
  if (isLocale(prefix)) {
    return { locale: prefix, rest: rest.startsWith("/") ? rest : `/${rest}` }
  }
  return { locale: DEFAULT_LOCALE, rest: href }
}

/** The same page in every language, for `hreflang` links and the sitemap. */
export function alternatePaths(path: string): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, localePath(locale, path)])
  ) as Record<Locale, string>
}

import "server-only"
import { notFound } from "next/navigation"
import { cache } from "react"
import { DEFAULT_LOCALE, LOCALE_SETTINGS, isLocale, type Locale } from "../config"
import { alternatePaths, getDictionary, localePath, type Dictionary } from "./index"

/**
 * The language of the page being rendered.
 *
 * Pages are rendered once and cached, so the language cannot come from a
 * cookie or header: it comes from the `[locale]` part of the address. Every
 * page, layout and `generateMetadata` under `app/[locale]` is wrapped in
 * `withLocale`, which records the language for that render; components below
 * them read it with `getLocale()` / `getT()` instead of receiving it as a prop.
 *
 * `cache` gives one holder per server render. Outside a render (server
 * actions, route handlers) there is nothing to read; use `lib/i18n/action`.
 */
const holder = cache(() => ({ locale: DEFAULT_LOCALE as Locale }))

export function setRequestLocale(locale: Locale): void {
  holder().locale = locale
}

export function getLocale(): Locale {
  return holder().locale
}

/** The interface texts in the language of the page being rendered. */
export function getT(): Dictionary {
  return getDictionary(getLocale())
}

/** The `Intl` code for dates and numbers on the page being rendered. */
export function intlCode(): string {
  return LOCALE_SETTINGS[getLocale()].intl
}

/** A storefront path in the language of the page being rendered. */
export function href(path: string): string {
  return localePath(getLocale(), path)
}

/**
 * The `alternates` metadata of a page: its own address in the language being
 * rendered as the canonical one, and the same page in the other languages.
 */
export function alternates(path: string): {
  canonical: string
  languages: Record<string, string>
} {
  return { canonical: href(path), languages: alternatePaths(path) }
}

type RouteProps = { params: Promise<{ locale?: string }> }

/**
 * Wraps a page, layout or `generateMetadata` so the language in the address is
 * set before it runs. An address with an unknown language is a 404.
 */
export function withLocale<Props, Result>(
  handler: (props: Props) => Result | Promise<Result>
): (props: Props) => Promise<Result> {
  return async (props: Props) => {
    const { locale } = await (props as unknown as RouteProps).params
    if (!isLocale(locale)) {
      notFound()
    }
    setRequestLocale(locale)
    return handler(props)
  }
}

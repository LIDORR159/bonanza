"use client"

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react"
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/config"
import { getDictionary, localePath, type Dictionary } from "@/lib/i18n"

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

/** Makes the page's language available to client components. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  useEffect(() => {
    // Read by server actions when the browser sends no referrer, and by the
    // payment return page, which the payment provider opens without a language.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale])

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export const useLocale = (): Locale => useContext(LocaleContext)

/** The interface texts in the page's language. */
export const useT = (): Dictionary => getDictionary(useContext(LocaleContext))

/** Turns a storefront path into the same path in the page's language. */
export function useLocalePath(): (path: string) => string {
  const locale = useContext(LocaleContext)
  return useCallback((path: string) => localePath(locale, path), [locale])
}

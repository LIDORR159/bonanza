import "server-only"
import { cookies, headers } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "../config"
import { getDictionary, localePath, splitLocale, type Dictionary } from "./index"

/**
 * The visitor's language inside a server action. An action runs outside any
 * page render, so it is read from the page that submitted the form, and from
 * the language cookie when the browser sent no referrer.
 */
export async function actionLocale(): Promise<Locale> {
  try {
    const referer = (await headers()).get("referer")
    if (referer) {
      return splitLocale(new URL(referer).pathname).locale
    }
    const remembered = (await cookies()).get(LOCALE_COOKIE)?.value
    if (isLocale(remembered)) {
      return remembered
    }
  } catch {
    // Not in a request: fall through to the default.
  }
  return DEFAULT_LOCALE
}

/** The interface texts in the visitor's language, for action results. */
export async function actionT(): Promise<Dictionary> {
  return getDictionary(await actionLocale())
}

/** A storefront path in the visitor's language, for redirects from actions. */
export async function actionHref(path: string): Promise<string> {
  return localePath(await actionLocale(), path)
}

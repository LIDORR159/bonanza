import { DEFAULT_LOCALE, type Locale } from "../config"
import { he, type Dictionary } from "./he"

const dictionaries: Record<Locale, Dictionary> = { he }

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? he
}

/**
 * The default-language dictionary. Hebrew is the only language today, so
 * components import this directly; a second language switches them to
 * `getDictionary(locale)`.
 */
export const t = he

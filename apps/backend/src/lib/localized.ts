import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DEFAULT_LOCALE } from "../modules/cms/constants"

/**
 * Reads content for the Store API in the language the request asks for.
 *
 * Records hold the Hebrew text. Other languages live in Medusa's Translation
 * Module, keyed by record id and locale code. Medusa resolves the request's
 * language (`?locale=` first, then the `x-medusa-locale` header) into
 * `req.locale` for every `/store` route, and Query swaps in the translated
 * value of each translatable field that has one. A field without a
 * translation keeps its Hebrew text, which is the fallback.
 *
 * Module services do not apply translations, so Store routes read through
 * here rather than through the service.
 */

// A record as Query returns it. Its columns depend on the entity asked for,
// so callers treat it as untyped, as they do a record read from the service
// by method name.
type Row = any

type ListOptions = {
  /** Defaults to every column of the record. Add `relation.*` for a relation. */
  fields?: string[]
  filters?: Record<string, unknown>
  order?: Record<string, "ASC" | "DESC">
  take?: number
}

// `query.graph` takes its entity names from types generated into `.medusa/`,
// which a fresh checkout does not have. This is the part of its signature
// used here, valid with or without them.
type Graph = (
  config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: { take?: number; order?: Record<string, "ASC" | "DESC"> }
  },
  options?: { locale?: string }
) => Promise<{ data: Row[] }>

/**
 * The language to translate into, or undefined for Hebrew: the records are
 * already in Hebrew, so there is nothing to look up.
 */
export function contentLocale(req: MedusaRequest): string | undefined {
  const locale = req.locale
  if (!locale || locale === DEFAULT_LOCALE || locale.startsWith(`${DEFAULT_LOCALE}-`)) {
    return undefined
  }
  return locale
}

export async function listLocalized(
  req: MedusaRequest,
  entity: string,
  options: ListOptions = {}
): Promise<Row[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const graph = query.graph.bind(query) as unknown as Graph
  const { data } = await graph(
    {
      entity,
      fields: options.fields ?? ["*"],
      filters: options.filters,
      pagination: { take: options.take ?? 100, order: options.order },
    },
    { locale: contentLocale(req) }
  )
  return data
}

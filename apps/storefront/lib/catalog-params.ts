import { SORT_OPTIONS, type CatalogQuery, type SortOption } from "./medusa/catalog"

/**
 * The catalog's URL parameters: `q`, `brand`, `min`, `max`, `sale`, `sort`,
 * `page`. Everything a visitor can filter by is in the address, so a filtered
 * view can be bookmarked, shared and reached without JavaScript.
 */
export type CatalogSearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const positive = (value: string | undefined): number | undefined => {
  const number = Number(value)
  return value && Number.isFinite(number) && number >= 0 ? number : undefined
}

export type ParsedCatalogParams = {
  q?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  onSale: boolean
  sort?: SortOption
  page: number
}

export function parseCatalogParams(params: CatalogSearchParams): ParsedCatalogParams {
  const sort = first(params.sort)
  const brand = first(params.brand)
  return {
    q: first(params.q)?.trim().slice(0, 120) || undefined,
    brand: brand && /^[a-z0-9-]{1,96}$/.test(brand) ? brand : undefined,
    minPrice: positive(first(params.min)),
    maxPrice: positive(first(params.max)),
    onSale: first(params.sale) === "1",
    sort: (SORT_OPTIONS as readonly string[]).includes(sort ?? "")
      ? (sort as SortOption)
      : undefined,
    page: Math.max(1, Math.floor(positive(first(params.page)) ?? 1)),
  }
}

export const toCatalogQuery = (
  parsed: ParsedCatalogParams,
  fixed: Partial<CatalogQuery> = {}
): CatalogQuery => ({
  q: parsed.q,
  brand: parsed.brand,
  minPrice: parsed.minPrice,
  maxPrice: parsed.maxPrice,
  onSale: parsed.onSale || undefined,
  sort: parsed.sort,
  page: parsed.page,
  withFacets: true,
  ...fixed,
})

/** The query string for the same view with some parameters changed. */
export function catalogHref(
  basePath: string,
  parsed: ParsedCatalogParams,
  changes: Partial<
    Record<"q" | "brand" | "min" | "max" | "sale" | "sort" | "page", string | null>
  >
): string {
  const params = new URLSearchParams()
  const current: Record<string, string | undefined> = {
    q: parsed.q,
    brand: parsed.brand,
    min: parsed.minPrice?.toString(),
    max: parsed.maxPrice?.toString(),
    sale: parsed.onSale ? "1" : undefined,
    sort: parsed.sort,
    page: parsed.page > 1 ? String(parsed.page) : undefined,
  }
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export const hasActiveFilters = (parsed: ParsedCatalogParams): boolean =>
  !!(parsed.brand || parsed.minPrice != null || parsed.maxPrice != null || parsed.onSale)

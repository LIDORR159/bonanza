import "server-only"
import { CATALOG_PAGE_SIZE, PUBLISHABLE_KEY, BACKEND_URL, REVALIDATE_SECONDS } from "../config"

/**
 * Product listings: search, category and brand pages, and the home page rails.
 * All of them read Medusa's search index through `POST /store/search`, which
 * is what makes price filtering and price sorting possible.
 */

export const SORT_OPTIONS = ["relevance", "newest", "price-asc", "price-desc", "title"] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export type CatalogQuery = {
  q?: string
  /** Matches the category and everything beneath it. */
  categoryId?: string
  brand?: string
  brandId?: string
  tagId?: string
  collectionId?: string
  onSale?: boolean
  minPrice?: number
  maxPrice?: number
  sort?: SortOption
  page?: number
  pageSize?: number
  /** Also return brand counts and the price range, for the filter panel. */
  withFacets?: boolean
}

/** What a product card needs. Prices are in ILS and include VAT. */
export type CatalogItem = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number | null
  maxPrice: number | null
  originalPrice: number | null
  onSale: boolean
  brand: string | null
  brandName: string | null
  labels: string[]
}

export type CatalogResult = {
  items: CatalogItem[]
  count: number
  page: number
  pageCount: number
  facets: {
    brands: { value: string; count: number }[]
    price: { min: number; max: number } | null
  }
}

type SearchHit = { id: string; document: Record<string, any> }
type SearchResult = {
  hits: SearchHit[]
  metadata?: { count?: number }
  facets?: Record<string, { values?: { value: string; count: number }[]; min?: number; max?: number }>
}

/**
 * Sort orders. Every one ends with the title as a second key: many products
 * share a creation time or a price, and without a tie-breaker the same product
 * can turn up on two pages while another is never shown.
 */
const ORDER: Record<SortOption, Record<string, "ASC" | "DESC"> | undefined> = {
  relevance: undefined,
  newest: { created_at: "DESC", title: "ASC" },
  "price-asc": { min_price_ils: "ASC", title: "ASC" },
  "price-desc": { min_price_ils: "DESC", title: "ASC" },
  title: { title: "ASC" },
}

const toItem = ({ document: doc }: SearchHit): CatalogItem => ({
  id: doc.id,
  title: doc.title ?? "",
  handle: doc.handle ?? "",
  thumbnail: doc.thumbnail ?? null,
  price: doc.min_price_ils ?? null,
  maxPrice: doc.max_price_ils ?? null,
  originalPrice: doc.original_price_ils ?? null,
  onSale: doc.on_sale_ils === true,
  brand: doc.brand ?? null,
  brandName: doc.brand_name ?? null,
  labels: doc.labels ?? [],
})

const EMPTY: CatalogResult = {
  items: [],
  count: 0,
  page: 1,
  pageCount: 0,
  facets: { brands: [], price: null },
}

export async function searchCatalog(query: CatalogQuery = {}): Promise<CatalogResult> {
  const pageSize = Math.min(Math.max(query.pageSize ?? CATALOG_PAGE_SIZE, 1), 48)
  const page = Math.max(query.page ?? 1, 1)
  const q = query.q?.trim().slice(0, 120)

  const filters: Record<string, unknown> = {}
  if (q) filters.q = q
  if (query.categoryId) filters.category_ids = query.categoryId
  if (query.brand) filters.brand = query.brand
  if (query.brandId) filters.brand_id = query.brandId
  if (query.tagId) filters.tag_ids = query.tagId
  if (query.collectionId) filters.collection_id = query.collectionId
  if (query.onSale) filters.on_sale_ils = true
  if (query.minPrice != null || query.maxPrice != null) {
    filters.min_price_ils = {
      ...(query.minPrice != null ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice != null ? { $lte: query.maxPrice } : {}),
    }
  }

  // Without a search term there is no relevance to sort by, so newest first.
  const sort = query.sort ?? (q ? "relevance" : "newest")
  const order = ORDER[sort] ?? (q ? undefined : ORDER.newest)

  const body = {
    entity: "product",
    filters,
    pagination: { skip: (page - 1) * pageSize, take: pageSize, ...(order ? { order } : {}) },
    search_options: {
      count: "exact",
      // The last word matches as a prefix, so results appear while typing.
      match_strategy: "last",
      ...(query.withFacets
        ? {
            facets: ["brand", { field: "min_price_ils", type: "stats" }],
            // Counts for a facet ignore the filter on that same facet, so
            // choosing one brand does not hide the others.
            disjunctive_facets: true,
          }
        : {}),
    },
  }

  let result: SearchResult | undefined
  try {
    const response = await fetch(`${BACKEND_URL}/store/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
      next: { tags: ["products"], revalidate: REVALIDATE_SECONDS },
    })
    if (!response.ok) {
      return EMPTY
    }
    result = ((await response.json()) as { results: SearchResult[] }).results[0]
  } catch {
    return EMPTY
  }
  if (!result) {
    return EMPTY
  }

  const count = result.metadata?.count ?? result.hits.length
  const priceStats = result.facets?.min_price_ils
  return {
    items: result.hits.map(toItem),
    count,
    page,
    pageCount: Math.ceil(count / pageSize),
    facets: {
      brands: result.facets?.brand?.values ?? [],
      price:
        priceStats?.min != null && priceStats.max != null
          ? { min: Math.floor(priceStats.min), max: Math.ceil(priceStats.max) }
          : null,
    },
  }
}

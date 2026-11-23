import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cachedFetch } from "./client"
import { getRegion } from "./regions"

export type ProductBrand = {
  id: string
  name: string
  handle: string
  logo_url: string | null
}
export type StoreProduct = HttpTypes.StoreProduct & { brand?: ProductBrand | null }

const DETAIL_FIELDS = [
  "*variants.calculated_price",
  "+variants.inventory_quantity",
  "+variants.manage_inventory",
  "+variants.allow_backorder",
  "*variants.options",
  "*options",
  "*options.values",
  "*images",
  "*categories",
  "*tags",
  "+metadata",
  // Every entry is prefixed with `+` or `*`: those add to the route's default
  // fields. A bare field name would replace the defaults and drop the title.
  "+brand.id",
  "+brand.name",
  "+brand.handle",
  "+brand.logo_url",
].join(",")

/** One product with prices for the store's region, or null if it does not exist. */
export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  const region = await getRegion()
  try {
    const { products } = await cachedFetch<{ products: StoreProduct[] }>(
      "/store/products",
      {
        query: { handle, region_id: region.id, fields: DETAIL_FIELDS, limit: 1 },
        tags: ["products", "brands"],
      }
    )
    return products[0] ?? null
  } catch {
    return null
  }
}

/** Handles of every published product, for the sitemap. */
export async function listProductHandles(): Promise<
  { handle: string; updated_at: string }[]
> {
  type Row = {
    handle: string
    updated_at: string
    metadata?: Record<string, unknown> | null
  }
  const all: Row[] = []
  const limit = 200
  try {
    for (let offset = 0; offset < 5000; offset += limit) {
      const { products, count } = await cachedFetch<{
        products: Row[]
        count: number
      }>("/store/products", {
        query: { fields: "handle,updated_at,metadata", limit, offset },
        tags: ["products"],
        revalidate: 3600,
      })
      all.push(...products)
      if (offset + limit >= count) {
        break
      }
    }
  } catch {
    // An unreachable backend yields a shorter sitemap, not a failed request.
  }
  // The admin's SEO panel can keep a product out of the sitemap.
  return all
    .filter((product) => product.metadata?.seo_exclude_from_sitemap !== "true")
    .map(({ handle, updated_at }) => ({ handle, updated_at }))
}

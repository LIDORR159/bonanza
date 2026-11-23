import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cachedFetch } from "./client"

export type Category = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle" | "description" | "parent_category_id" | "metadata"
> & { rank?: number | null }

/** Every active public category, in the order set in the admin. */
export async function listCategories(): Promise<Category[]> {
  try {
    const { product_categories } = await cachedFetch<{ product_categories: Category[] }>(
      "/store/product-categories",
      {
        query: {
          fields: "id,name,handle,description,parent_category_id,rank,metadata",
          limit: 200,
          order: "rank",
        },
        tags: ["categories"],
      }
    )
    return product_categories
  } catch {
    return []
  }
}

export async function getCategoryByHandle(handle: string): Promise<Category | null> {
  return (await listCategories()).find((category) => category.handle === handle) ?? null
}

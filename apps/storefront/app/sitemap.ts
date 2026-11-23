import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/config"
import { listCategories } from "@/lib/medusa/categories"
import { listBrands, listPages } from "@/lib/medusa/content"
import { listProductHandles } from "@/lib/medusa/products"

// Answered per request: the site address and indexing switch come from the
// environment the server runs in, not from the build.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, pages] = await Promise.all([
    listProductHandles(),
    listCategories(),
    listBrands(),
    listPages(),
  ])
  const url = (path: string) => `${SITE_URL}${path}`
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/products"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/brands"), changeFrequency: "weekly", priority: 0.5 },
    ...categories.map((category) => ({
      url: url(`/categories/${category.handle}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...brands.map((brand) => ({
      url: url(`/brands/${brand.handle}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...products.map((product) => ({
      url: url(`/products/${product.handle}`),
      lastModified: new Date(product.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Pages can be kept out of the sitemap from the admin.
    ...pages
      .filter((page) => page.include_in_sitemap)
      .map((page) => ({
        url: url(`/${page.slug}`),
        lastModified: new Date(page.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ]
}

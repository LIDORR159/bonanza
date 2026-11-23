import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/config"
import { alternatePaths } from "@/lib/i18n"
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
  type Entry = Omit<MetadataRoute.Sitemap[number], "url"> & { path: string }
  const entries: Entry[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/products", changeFrequency: "daily", priority: 0.9 },
    { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
    { path: "/brands", changeFrequency: "weekly", priority: 0.5 },
    ...categories.map((category) => ({
      path: `/categories/${category.handle}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...brands.map((brand) => ({
      path: `/brands/${brand.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...products.map((product) => ({
      path: `/products/${product.handle}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Pages can be kept out of the sitemap from the admin.
    ...pages
      .filter((page) => page.include_in_sitemap)
      .map((page) => ({
        path: `/${page.slug}`,
        lastModified: new Date(page.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ]

  // One entry per page, in Hebrew, naming its English and Arabic versions.
  const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL
  return entries.map(({ path, ...entry }) => ({
    ...entry,
    url: absolute(path),
    alternates: {
      languages: Object.fromEntries(
        Object.entries(alternatePaths(path)).map(([locale, localized]) => [
          locale,
          absolute(localized),
        ])
      ),
    },
  }))
}

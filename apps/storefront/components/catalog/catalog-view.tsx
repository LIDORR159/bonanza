import type { ReactNode } from "react"
import { ProductGrid } from "@/components/product/product-card"
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs"
import { ButtonLink } from "@/components/ui/button"
import {
  parseCatalogParams,
  toCatalogQuery,
  type CatalogSearchParams,
} from "@/lib/catalog-params"
import { getT } from "@/lib/i18n/server"
import { searchCatalog, type CatalogQuery } from "@/lib/medusa/catalog"
import { listCategories } from "@/lib/medusa/categories"
import { BannerBlock } from "@/components/home/banner-block"
import { getBanners, listBrands } from "@/lib/medusa/content"
import { CatalogFilters } from "./catalog-filters"
import { Pagination } from "./pagination"

/**
 * A product listing with its filters: the page body shared by the catalog,
 * category, brand and search views.
 */
export async function CatalogView({
  basePath,
  title,
  description,
  breadcrumbs,
  searchParams,
  fixed,
  hideBrand,
  currentCategory,
  header,
}: {
  basePath: string
  title: string
  description?: string | null
  breadcrumbs: Crumb[]
  searchParams: CatalogSearchParams
  /** Filters that define this view and cannot be changed by the visitor. */
  fixed?: Partial<CatalogQuery>
  hideBrand?: boolean
  currentCategory?: string
  header?: ReactNode
}) {
  const t = getT()
  const params = parseCatalogParams(searchParams)
  const [result, brands, categories, banners] = await Promise.all([
    searchCatalog(toCatalogQuery(params, fixed)),
    listBrands(),
    listCategories(),
    getBanners("catalog_top"),
  ])
  const brandNames = Object.fromEntries(brands.map((brand) => [brand.handle, brand.name]))

  const categoryLinks = [
    {
      name: t.catalog.allCategories,
      href: "/products",
      current: !currentCategory && !hideBrand,
    },
    ...categories
      .filter((category) => !category.parent_category_id)
      .map((category) => ({
        name: category.name,
        href: `/categories/${category.handle}`,
        current: category.handle === currentCategory,
      })),
  ]

  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <Breadcrumbs items={breadcrumbs} />
      <header className="mb-8 border-b border-ink-700 pb-7">
        {header}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-lg text-mist-300">{description}</p>
        )}
        <p className="mt-3 text-sm text-mist-400" aria-live="polite">
          {t.catalog.count(result.count)}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
        <CatalogFilters
          basePath={basePath}
          params={params}
          facets={result.facets}
          brandNames={brandNames}
          hideBrand={hideBrand}
          categories={categoryLinks}
        />
        <div>
          {banners[0] && params.page === 1 && (
            <div className="mb-6">
              <BannerBlock banner={banners[0]} />
            </div>
          )}
          {result.items.length ? (
            <>
              <ProductGrid products={result.items} columns={3} priorityCount={3} />
              <Pagination
                basePath={basePath}
                params={params}
                pageCount={result.pageCount}
              />
            </>
          ) : (
            <div className="rounded-lg border border-ink-600 bg-ink-850 px-6 py-16 text-center">
              <p className="text-xl font-semibold">{t.catalog.empty}</p>
              <p className="mt-2 text-mist-300">{t.catalog.emptyHint}</p>
              <ButtonLink href={basePath} variant="secondary" className="mt-6">
                {t.catalog.clearFilters}
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import { CatalogView } from "@/components/catalog/catalog-view"
import { parseCatalogParams, type CatalogSearchParams } from "@/lib/catalog-params"
import { alternates, getT, withLocale } from "@/lib/i18n/server"

// Filters, sorting and the page number come from the query string, so this
// page is rendered for each request. The catalog data behind it is still
// cached (lib/medusa/client.ts).
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<CatalogSearchParams> }

function titleFor(params: ReturnType<typeof parseCatalogParams>) {
  const t = getT()
  return params.q
    ? t.catalog.searchResults(params.q)
    : params.onSale
      ? t.catalog.saleTitle
      : t.catalog.title
}

export const generateMetadata = withLocale(async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = parseCatalogParams(await searchParams)
  return {
    title: titleFor(params),
    alternates: alternates("/products"),
    // Search results and filtered views are endless variations of one page.
    robots: params.q ? { index: false, follow: true } : undefined,
  }
})

export default withLocale(async function ProductsPage({ searchParams }: Props) {
  const t = getT()
  const raw = await searchParams
  const title = titleFor(parseCatalogParams(raw))
  return (
    <CatalogView
      basePath="/products"
      title={title}
      breadcrumbs={[{ name: t.catalog.title, path: "/products" }]}
      searchParams={raw}
    />
  )
})

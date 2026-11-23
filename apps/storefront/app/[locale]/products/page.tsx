import type { Metadata } from "next"
import { CatalogView } from "@/components/catalog/catalog-view"
import { parseCatalogParams, type CatalogSearchParams } from "@/lib/catalog-params"
import { t } from "@/lib/i18n"

type Props = { searchParams: Promise<CatalogSearchParams> }

const titleFor = (params: ReturnType<typeof parseCatalogParams>) =>
  params.q
    ? t.catalog.searchResults(params.q)
    : params.onSale
      ? t.catalog.saleTitle
      : t.catalog.title

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = parseCatalogParams(await searchParams)
  return {
    title: titleFor(params),
    alternates: { canonical: "/products" },
    // Search results and filtered views are endless variations of one page.
    robots: params.q ? { index: false, follow: true } : undefined,
  }
}

export default async function ProductsPage({ searchParams }: Props) {
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
}

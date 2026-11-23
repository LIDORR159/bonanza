import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView } from "@/components/catalog/catalog-view"
import type { CatalogSearchParams } from "@/lib/catalog-params"
import { alternates, getT, withLocale } from "@/lib/i18n/server"
import { getBrand } from "@/lib/medusa/content"

// Filters, sorting and the page number come from the query string, so this
// page is rendered for each request. The catalog data behind it is still
// cached (lib/medusa/client.ts).
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<CatalogSearchParams>
}

export const generateMetadata = withLocale(async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { handle } = await params
  const brand = await getBrand(handle)
  if (!brand) {
    return {}
  }
  return {
    title: brand.name,
    description: brand.description ?? undefined,
    alternates: alternates(`/brands/${brand.handle}`),
  }
})

export default withLocale(async function BrandPage({ params, searchParams }: Props) {
  const t = getT()
  const { handle } = await params
  const brand = await getBrand(handle)
  if (!brand) {
    notFound()
  }
  return (
    <CatalogView
      basePath={`/brands/${brand.handle}`}
      title={brand.name}
      description={brand.description}
      breadcrumbs={[
        { name: t.catalog.brandsTitle, path: "/brands" },
        { name: brand.name, path: `/brands/${brand.handle}` },
      ]}
      searchParams={await searchParams}
      fixed={{ brand: brand.handle }}
      hideBrand
    />
  )
})

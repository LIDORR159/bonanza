import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView } from "@/components/catalog/catalog-view"
import type { CatalogSearchParams } from "@/lib/catalog-params"
import { t } from "@/lib/i18n"
import { getBrand } from "@/lib/medusa/content"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const brand = await getBrand(handle)
  if (!brand) {
    return {}
  }
  return {
    title: brand.name,
    description: brand.description ?? undefined,
    alternates: { canonical: `/brands/${brand.handle}` },
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
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
}

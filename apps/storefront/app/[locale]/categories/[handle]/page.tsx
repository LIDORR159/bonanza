import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView } from "@/components/catalog/catalog-view"
import type { CatalogSearchParams } from "@/lib/catalog-params"
import { alternates, getT, withLocale } from "@/lib/i18n/server"
import { getCategoryByHandle } from "@/lib/medusa/categories"

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
  const category = await getCategoryByHandle(handle)
  if (!category) {
    return {}
  }
  const metadata = (category.metadata ?? {}) as Record<string, string>
  return {
    title: metadata.seo_title || category.name,
    description: metadata.seo_description || category.description || undefined,
    alternates: alternates(`/categories/${category.handle}`),
    openGraph: metadata.seo_og_image ? { images: [metadata.seo_og_image] } : undefined,
  }
})

export default withLocale(async function CategoryPage({ params, searchParams }: Props) {
  const t = getT()
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) {
    notFound()
  }
  return (
    <CatalogView
      basePath={`/categories/${category.handle}`}
      title={category.name}
      description={category.description}
      breadcrumbs={[
        { name: t.catalog.title, path: "/products" },
        { name: category.name, path: `/categories/${category.handle}` },
      ]}
      searchParams={await searchParams}
      fixed={{ categoryId: category.id }}
      currentCategory={category.handle}
    />
  )
})

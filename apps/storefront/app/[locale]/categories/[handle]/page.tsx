import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogView } from "@/components/catalog/catalog-view"
import type { CatalogSearchParams } from "@/lib/catalog-params"
import { t } from "@/lib/i18n"
import { getCategoryByHandle } from "@/lib/medusa/categories"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) {
    return {}
  }
  const metadata = (category.metadata ?? {}) as Record<string, string>
  return {
    title: metadata.seo_title || category.name,
    description: metadata.seo_description || category.description || undefined,
    alternates: { canonical: `/categories/${category.handle}` },
    openGraph: metadata.seo_og_image ? { images: [metadata.seo_og_image] } : undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
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
}

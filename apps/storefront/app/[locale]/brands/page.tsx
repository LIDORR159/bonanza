import type { Metadata } from "next"
import { BrandStrip } from "@/components/home/brand-strip"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { REVALIDATE_SECONDS } from "@/lib/config"
import { t } from "@/lib/i18n"
import { listBrands } from "@/lib/medusa/content"

export const revalidate = REVALIDATE_SECONDS

export const metadata: Metadata = {
  title: t.catalog.brandsTitle,
  alternates: { canonical: "/brands" },
}

export default async function BrandsPage() {
  const brands = await listBrands()
  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: t.catalog.brandsTitle, path: "/brands" }]} />
      <h1 className="mb-8 text-3xl sm:text-4xl">{t.catalog.brandsTitle}</h1>
      {brands.length ? (
        <BrandStrip brands={brands} />
      ) : (
        <p className="text-mist-300">{t.catalog.empty}</p>
      )}
    </div>
  )
}

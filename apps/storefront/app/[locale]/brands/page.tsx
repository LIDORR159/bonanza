import type { Metadata } from "next"
import { BrandStrip } from "@/components/home/brand-strip"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { alternates, getT, withLocale } from "@/lib/i18n/server"
import { listBrands } from "@/lib/medusa/content"

// Next.js reads this export without running the file, so it has to be a
// literal. Keep it equal to REVALIDATE_SECONDS in lib/config.ts.
export const revalidate = 300

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.catalog.brandsTitle,
    alternates: alternates("/brands"),
  }
})

export default withLocale(async function BrandsPage() {
  const t = getT()
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
})

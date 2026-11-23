import type { Metadata } from "next"
import { Link } from "@/components/ui/link"
import { notFound } from "next/navigation"
import { ProductGrid } from "@/components/product/product-card"
import { ProductGallery } from "@/components/product/product-gallery"
import {
  ProductPurchase,
  type PurchaseVariant,
} from "@/components/product/product-purchase"
import { JsonLd, productJsonLd } from "@/components/seo/json-ld"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { TruckIcon } from "@/components/ui/icons"
import { SectionHeading } from "@/components/ui/section-heading"
import { formatPrice } from "@/lib/format"
import { alternates, getT, withLocale } from "@/lib/i18n/server"
import { searchCatalog } from "@/lib/medusa/catalog"
import { getSettings } from "@/lib/medusa/content"
import { getProductByHandle } from "@/lib/medusa/products"
import {
  maxPurchasable,
  productSpecs,
  selectableOptions,
  stockState,
  variantPrice,
} from "@/lib/product"

// Next.js reads this export without running the file, so it has to be a
// literal. Keep it equal to REVALIDATE_SECONDS in lib/config.ts.
export const revalidate = 300

/** Rendered on first request, then cached and refreshed in the background. */
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ handle: string }> }

export const generateMetadata = withLocale(async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) {
    return {}
  }
  const metadata = (product.metadata ?? {}) as Record<string, string>
  const images = (product.images ?? []).map((image) => image.url)
  const description =
    metadata.seo_description ||
    product.subtitle ||
    product.description?.slice(0, 160) ||
    undefined
  return {
    title: metadata.seo_title || product.title,
    description,
    alternates: alternates(`/products/${product.handle}`),
    openGraph: {
      title: metadata.seo_title || product.title,
      description,
      images: metadata.seo_og_image ? [metadata.seo_og_image] : images.slice(0, 1),
    },
  }
})

export default withLocale(async function ProductPage({ params }: Props) {
  const t = getT()
  const { handle } = await params
  const [product, settings] = await Promise.all([
    getProductByHandle(handle),
    getSettings(),
  ])
  if (!product) {
    notFound()
  }

  const options = selectableOptions(product)
  const optionIds = new Set(options.map((option) => option.id))
  const variants: PurchaseVariant[] = (product.variants ?? []).map((variant) => {
    const stock = stockState(variant)
    return {
      id: variant.id,
      sku: variant.sku ?? null,
      options: Object.fromEntries(
        (variant.options ?? [])
          .filter((value) => value.option_id && optionIds.has(value.option_id))
          .map((value) => [value.option_id as string, value.value])
      ),
      price: variantPrice(variant),
      stock,
      remaining: stock === "low_stock" ? (variant.inventory_quantity ?? null) : null,
      max: maxPurchasable(variant),
    }
  })

  const images = Array.from(
    new Set(
      [product.thumbnail, ...(product.images ?? []).map((image) => image.url)].filter(
        (url): url is string => !!url
      )
    )
  )
  const specs = productSpecs(product, t)
  const category = product.categories?.[0]
  const related = category
    ? (await searchCatalog({ categoryId: category.id, pageSize: 5 })).items
        .filter((item) => item.id !== product.id)
        .slice(0, 4)
    : []

  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <JsonLd data={productJsonLd(product)} />
      <Breadcrumbs
        items={[
          { name: t.catalog.title, path: "/products" },
          ...(category
            ? [{ name: category.name, path: `/categories/${category.handle}` }]
            : []),
          { name: product.title, path: `/products/${product.handle}` },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images} title={product.title} />

        <div>
          {product.brand && (
            <Link
              href={`/brands/${product.brand.handle}`}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-mist-400 hover:text-paper"
            >
              <bdi>{product.brand.name}</bdi>
            </Link>
          )}
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.title}</h1>
          {product.subtitle && (
            <p className="mt-2 text-lg text-mist-300">{product.subtitle}</p>
          )}

          <div className="mt-6 border-t border-ink-700 pt-6">
            <ProductPurchase options={options} variants={variants} />
          </div>

          <div className="mt-6 flex gap-3.5 rounded-lg border border-ink-600 bg-ink-850 p-4 text-sm">
            <TruckIcon className="mt-0.5 shrink-0 text-mist-300" />
            <div className="space-y-1">
              <p className="font-semibold text-paper">{t.product.shippingInfoTitle}</p>
              {settings.free_shipping_threshold != null && (
                <p className="text-mist-200">
                  {t.product.freeShippingOver}{" "}
                  <bdi dir="ltr">{formatPrice(settings.free_shipping_threshold)}</bdi>
                </p>
              )}
              <p className="text-mist-300">{t.product.shippingInfo}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-14">
        {product.description && (
          <section aria-labelledby="product-description">
            <h2 id="product-description" className="mb-4 text-xl">
              {t.product.description}
            </h2>
            <p className="whitespace-pre-line text-[1.05rem] leading-relaxed text-mist-200">
              {product.description}
            </p>
          </section>
        )}
        {specs.length > 0 && (
          <section aria-labelledby="product-specs">
            <h2 id="product-specs" className="mb-4 text-xl">
              {t.product.specifications}
            </h2>
            <dl className="divide-y divide-ink-700 border-y border-ink-700 text-[0.95rem]">
              {specs.map((spec) => (
                <div key={spec.label} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                  <dt className="text-mist-400">{spec.label}</dt>
                  <dd className="text-paper">
                    <bdi>{spec.value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading title={t.product.related} />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
})

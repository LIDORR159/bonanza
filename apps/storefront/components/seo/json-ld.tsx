import type { StoreSiteSettings } from "@bonanza/types"
import type { HttpTypes } from "@medusajs/types"
import { CURRENCY, SITE_URL } from "@/lib/config"
import { cheapestPrice, stockState } from "@/lib/product"

/**
 * Structured data for search engines. The JSON is escaped so that product
 * text containing "</script>" cannot break out of the tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}

export const organizationJsonLd = (settings: StoreSiteSettings) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: settings.store_name,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/bonanza-lockup-720.png`,
  ...(settings.contact_phone || settings.contact_email
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: settings.contact_phone ?? undefined,
          email: settings.contact_email ?? undefined,
          availableLanguage: ["he"],
        },
      }
    : {}),
  sameAs: [
    settings.instagram_url,
    settings.facebook_url,
    settings.tiktok_url,
    settings.youtube_url,
  ].filter(Boolean),
})

export const websiteJsonLd = (settings: StoreSiteSettings) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: settings.store_name,
  url: SITE_URL,
  inLanguage: "he",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/products?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
})

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
})

export function productJsonLd(
  product: HttpTypes.StoreProduct & { brand?: { name: string } | null }
) {
  const price = cheapestPrice(product)
  const anyInStock = (product.variants ?? []).some(
    (variant) => stockState(variant) !== "out_of_stock"
  )
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: (product.images ?? []).map((image) => image.url),
    sku: product.variants?.[0]?.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    url: `${SITE_URL}/products/${product.handle}`,
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/products/${product.handle}`,
            priceCurrency: CURRENCY,
            // Prices shown to consumers in Israel include VAT.
            price: price.amount.toFixed(2),
            availability: anyInStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
  }
}

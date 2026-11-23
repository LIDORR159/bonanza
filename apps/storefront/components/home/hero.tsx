import type { StoreHomepageSection } from "@bonanza/types"
import Image from "next/image"
import { ProductCard } from "@/components/product/product-card"
import { BookingLink } from "@/components/ui/booking-link"
import { ButtonLink } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"
import type { CatalogItem } from "@/lib/medusa/catalog"

/** Shown until a hero photograph is uploaded in the admin. */
const DEFAULT_IMAGE = "/home/hero.jpg"

const isExternal = (url: string) => /^https?:\/\//.test(url)

/**
 * The opening section: a large headline, one line of copy and the two main
 * actions on the reading side, a framed photograph on the other.
 *
 * The first action is normally the booking link, which leaves the site, so it
 * opens in a new tab. When a product rail directly follows the hero, its cards
 * overlap the hero's bottom edge.
 */
export function Hero({
  section,
  products,
  productsTitle,
}: {
  section: Pick<
    StoreHomepageSection,
    "title" | "subtitle" | "image_url" | "image_alt" | "cta" | "secondary_cta"
  >
  /** Cards that overlap the hero's bottom edge. */
  products?: CatalogItem[]
  productsTitle?: string | null
}) {
  const t = getT()
  const overlap = (products ?? []).slice(0, 4)
  const primary = section.cta ?? { label: t.home.shopNow, url: "/products" }

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink-900">
        {/* Light falling on the photograph's side, fading into the page colour. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(55%_65%_at_22%_40%,rgb(255_255_255/0.1),transparent_70%),linear-gradient(180deg,transparent_60%,var(--color-ink-950))] ltr:-scale-x-100"
        />

        <div
          className={`container-site grid items-center gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pt-20 ${
            overlap.length ? "pb-44 sm:pb-52 lg:pb-60" : "pb-14 lg:pb-24"
          }`}
        >
          <div className="animate-rise">
            <p className="eyebrow mb-5" dir="ltr">
              {t.brand.tagline}
            </p>
            <h1 className="text-[2.6rem] font-black leading-[1.04] sm:text-6xl lg:text-7xl">
              {section.title || t.brand.name}
            </h1>
            {section.subtitle && (
              <p className="mt-5 max-w-md text-lg leading-relaxed text-mist-300">
                {section.subtitle}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {isExternal(primary.url) ? (
                <BookingLink href={primary.url} label={primary.label} size="lg" icon />
              ) : (
                <ButtonLink href={primary.url} size="lg">
                  {primary.label}
                </ButtonLink>
              )}
              {section.secondary_cta && (
                <ButtonLink
                  href={section.secondary_cta.url}
                  size="lg"
                  variant="secondary"
                >
                  {section.secondary_cta.label}
                </ButtonLink>
              )}
            </div>
          </div>

          <div className="relative animate-fade">
            {/* An offset hairline frame behind the photograph. */}
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -end-3 start-6 top-6 rounded-xl border border-ink-500/70"
            />
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-raised">
              <Image
                src={section.image_url || DEFAULT_IMAGE}
                alt={section.image_alt ?? ""}
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {overlap.length > 0 && (
        <section
          aria-label={productsTitle ?? t.home.featuredFallbackTitle}
          className="container-site relative z-10 -mt-36 sm:-mt-44 lg:-mt-48"
        >
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {overlap.map((product, index) => (
              <li
                key={product.id}
                className="animate-rise"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <ProductCard
                  product={product}
                  priority
                  sizes="(min-width: 1024px) 22vw, 46vw"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

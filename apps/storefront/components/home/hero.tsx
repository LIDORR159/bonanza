import type { StoreHomepageSection } from "@bonanza/types"
import Image from "next/image"
import { ProductCard } from "@/components/product/product-card"
import { ButtonLink } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import type { CatalogItem } from "@/lib/medusa/catalog"

/**
 * The opening section, after the first reference design: a large headline,
 * one line of copy and a solid white button on the reading side, a visual on
 * the other, and a row of product cards overlapping the bottom edge.
 *
 * With no image set in the admin the visual is the brand's barber pole under a
 * spotlight.
 */
export function Hero({
  section,
  products,
  productsTitle,
}: {
  section: Pick<
    StoreHomepageSection,
    "title" | "subtitle" | "image_url" | "mobile_image_url" | "image_alt" | "cta" | "secondary_cta"
  >
  /** Cards that overlap the hero's bottom edge. */
  products?: CatalogItem[]
  productsTitle?: string | null
}) {
  const overlap = (products ?? []).slice(0, 4)
  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink-900">
        {/* Spotlight on the visual side, falling off into the page colour. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_22%_38%,rgb(255_255_255/0.13),transparent_70%),linear-gradient(180deg,transparent_55%,var(--color-ink-950))]"
        />
        {section.image_url && (
          <div className="absolute inset-y-0 end-0 -z-10 w-full lg:w-[58%]">
            <Image
              src={section.image_url}
              alt={section.image_alt ?? ""}
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-top opacity-45 grayscale lg:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-ink-900 via-ink-900/55 to-transparent lg:via-ink-900/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
          </div>
        )}

        <div
          className={`container-site grid items-center gap-8 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 ${
            overlap.length ? "pb-44 sm:pb-52 lg:pb-60" : "pb-16 lg:pb-24"
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
              <ButtonLink href={section.cta?.url ?? "/products"} size="lg">
                {section.cta?.label ?? t.home.shopNow}
              </ButtonLink>
              {section.secondary_cta && (
                <ButtonLink href={section.secondary_cta.url} size="lg" variant="secondary">
                  {section.secondary_cta.label}
                </ButtonLink>
              )}
            </div>
          </div>

          {!section.image_url && (
            <div
              aria-hidden="true"
              className="pointer-events-none relative hidden h-[26rem] items-center justify-center lg:flex"
            >
              <div className="absolute size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.2),transparent)] blur-2xl" />
              <Image
                src="/brand/barber-pole.webp"
                alt=""
                width={180}
                height={512}
                priority
                unoptimized
                className="relative h-[25rem] w-auto drop-shadow-[0_30px_40px_rgb(0_0_0/0.75)] animate-fade"
              />
            </div>
          )}
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
                <ProductCard product={product} priority sizes="(min-width: 1024px) 22vw, 46vw" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

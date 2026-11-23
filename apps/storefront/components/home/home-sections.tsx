import type { ProductSource, StoreHomepageSection } from "@bonanza/types"
import { ProductGrid } from "@/components/product/product-card"
import { Reveal } from "@/components/ui/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { t } from "@/lib/i18n"
import { searchCatalog, type CatalogItem, type CatalogQuery } from "@/lib/medusa/catalog"
import { listCategories } from "@/lib/medusa/categories"
import { getBanners, listBrands } from "@/lib/medusa/content"
import { AcademySection } from "./academy-section"
import { BannerBlock } from "./banner-block"
import { BrandStrip } from "./brand-strip"
import { CategoryTiles } from "./category-tiles"
import { Hero } from "./hero"
import { NewsletterForm } from "./newsletter-form"

/**
 * Renders the home page from the sections set up in the admin, in their order.
 * Each section type has one component; a section whose data is empty (a rail
 * with no products, a slot with no active banner) renders nothing.
 */

const sourceQuery = (source: ProductSource | undefined): CatalogQuery => {
  switch (source?.type) {
    case "collection":
      return { collectionId: source.id }
    case "category":
      return { categoryId: source.id }
    case "tag":
      return { tagId: source.id }
    case "brand":
      return { brandId: source.id }
    case "on_sale":
      return { onSale: true }
    default:
      return { sort: "newest" }
  }
}

async function railProducts(section: StoreHomepageSection): Promise<CatalogItem[]> {
  const { items } = await searchCatalog({
    ...sourceQuery(section.settings.product_source),
    pageSize: section.settings.limit ?? 4,
  })
  return items
}

const Block = ({ children, id }: { children: React.ReactNode; id: string }) => (
  <section id={id} className="container-site mt-20 scroll-mt-28 lg:mt-28">
    <Reveal>{children}</Reveal>
  </section>
)

async function Section({ section }: { section: StoreHomepageSection }) {
  switch (section.type) {
    case "product_rail": {
      const products = await railProducts(section)
      if (!products.length) {
        return null
      }
      return (
        <Block id={section.key}>
          <SectionHeading title={section.title} eyebrow={section.subtitle} link={section.cta} />
          <ProductGrid products={products} />
        </Block>
      )
    }

    case "categories": {
      const categories = (await listCategories())
        .filter((category) => !category.parent_category_id)
        .slice(0, section.settings.limit ?? 8)
      if (!categories.length) {
        return null
      }
      // One product image stands for each category.
      const tiles = await Promise.all(
        categories.map(async (category) => ({
          id: category.id,
          name: category.name,
          handle: category.handle,
          image:
            (await searchCatalog({ categoryId: category.id, pageSize: 1 })).items[0]?.thumbnail ??
            null,
        }))
      )
      return (
        <Block id={section.key}>
          <SectionHeading title={section.title ?? t.home.categoriesTitle} link={section.cta} />
          <CategoryTiles categories={tiles} />
        </Block>
      )
    }

    case "banner_slot": {
      const [banner] = await getBanners(section.settings.banner_placement ?? "home_primary")
      if (!banner) {
        return null
      }
      return (
        <Block id={section.key}>
          <BannerBlock banner={banner} />
        </Block>
      )
    }

    case "brands": {
      const brands = (await listBrands({ featured: true })).slice(0, section.settings.limit ?? 8)
      if (!brands.length) {
        return null
      }
      return (
        <Block id={section.key}>
          <SectionHeading title={section.title ?? t.home.brandsTitle} link={section.cta} />
          <BrandStrip brands={brands} />
        </Block>
      )
    }

    case "academy":
      return (
        <div id={section.key} className="mt-20 scroll-mt-28 lg:mt-28">
          <AcademySection section={section} />
        </div>
      )

    case "editorial":
      return (
        <Block id={section.key}>
          <div className="mx-auto max-w-3xl text-center">
            {section.subtitle && <p className="eyebrow mb-3">{section.subtitle}</p>}
            {section.title && <h2 className="text-3xl sm:text-4xl">{section.title}</h2>}
            {section.body && (
              <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-mist-300">
                {section.body}
              </p>
            )}
          </div>
        </Block>
      )

    case "newsletter":
      return (
        <Block id={section.key}>
          <div className="mx-auto max-w-2xl rounded-xl border border-ink-600/70 bg-ink-850 p-7 sm:p-10">
            <h2 className="text-2xl sm:text-3xl">{section.title}</h2>
            {section.subtitle && <p className="mb-6 mt-2 text-mist-300">{section.subtitle}</p>}
            <NewsletterForm />
          </div>
        </Block>
      )

    default:
      return null
  }
}

export async function HomeSections({ sections }: { sections: StoreHomepageSection[] }) {
  const rendered: React.ReactNode[] = []

  for (let index = 0; index < sections.length; index++) {
    const section = sections[index]!
    if (section.type === "hero") {
      // The rail that directly follows the hero becomes the row of cards
      // overlapping its bottom edge, as in the reference design.
      const next = sections[index + 1]
      const overlap = next?.type === "product_rail" ? await railProducts(next) : []
      rendered.push(
        <Hero
          key={section.id}
          section={section}
          products={overlap}
          productsTitle={next?.title}
        />
      )
      if (overlap.length) {
        index++
      }
      continue
    }
    rendered.push(<Section key={section.id} section={section} />)
  }

  return <>{rendered}</>
}

/** The home page shown before any section exists in the admin. */
export async function DefaultHome() {
  const { items } = await searchCatalog({ sort: "newest", pageSize: 8 })
  return (
    <>
      <Hero
        section={{
          title: t.brand.name,
          subtitle: null,
          image_url: null,
          mobile_image_url: null,
          image_alt: null,
          cta: { label: t.home.shopNow, url: "/products" },
          secondary_cta: null,
        }}
        products={items.slice(0, 4)}
      />
      {items.length > 4 && (
        <Block id="new">
          <SectionHeading
            title={t.home.featuredFallbackTitle}
            link={{ label: t.home.viewAll, url: "/products" }}
          />
          <ProductGrid products={items.slice(4)} />
        </Block>
      )}
    </>
  )
}

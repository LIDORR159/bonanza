import { Link } from "@/components/ui/link"
import { Price } from "@/components/ui/price"
import { discountPercent } from "@/lib/format"
import { getT } from "@/lib/i18n/server"
import type { CatalogItem } from "@/lib/medusa/catalog"
import { ProductImage } from "./product-image"

/**
 * The product card from the references: image on a grey well, a hairline,
 * then the name and price on the dark card.
 */
export function ProductCard({
  product,
  priority,
  sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw",
}: {
  product: CatalogItem
  priority?: boolean
  sizes?: string
}) {
  const t = getT()
  const percent =
    product.onSale && product.originalPrice && product.price
      ? discountPercent(product.originalPrice, product.price)
      : 0
  const hasRange =
    product.price != null && product.maxPrice != null && product.maxPrice > product.price

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-ink-600/70 bg-ink-800 shadow-card transition duration-300 hover:-translate-y-1 hover:border-ink-500">
      <ProductImage
        src={product.thumbnail}
        alt=""
        sizes={sizes}
        priority={priority}
        className="aspect-square"
      />
      {product.onSale && (
        <span className="absolute start-3 top-3 rounded-sm bg-paper px-2 py-1 text-[0.7rem] font-bold leading-none text-ink-950">
          {t.product.sale}
          {percent > 0 && (
            <>
              {" "}
              <bdi dir="ltr">-{percent}%</bdi>
            </>
          )}
        </span>
      )}
      <div className="flex flex-1 flex-col gap-1.5 border-t border-ink-600/70 p-4">
        {product.brandName && (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mist-400">
            <bdi>{product.brandName}</bdi>
          </p>
        )}
        <h3 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-paper">
          {/* The link covers the whole card, so the card is one tab stop. */}
          <Link
            href={`/products/${product.handle}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-paper"
          >
            {product.title}
          </Link>
        </h3>
        <Price
          amount={product.price}
          original={product.onSale ? product.originalPrice : null}
          from={hasRange}
          className="mt-auto pt-1.5"
        />
      </div>
    </article>
  )
}

export function ProductGrid({
  products,
  priorityCount = 0,
  columns = 4,
}: {
  products: CatalogItem[]
  priorityCount?: number
  columns?: 3 | 4
}) {
  return (
    <ul
      className={
        columns === 4
          ? "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          : "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3"
      }
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  )
}

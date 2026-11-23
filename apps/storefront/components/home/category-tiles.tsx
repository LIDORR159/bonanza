import { Link } from "@/components/ui/link"
import { ProductImage } from "@/components/product/product-image"
import { ArrowIcon } from "@/components/ui/icons"

export type CategoryTile = {
  id: string
  name: string
  handle: string
  /** A product image that stands for the category. */
  image: string | null
}

export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/categories/${category.handle}`}
            className="group relative block overflow-hidden rounded-lg border border-ink-600/70 bg-ink-800 transition duration-300 hover:-translate-y-1 hover:border-ink-500"
          >
            <ProductImage
              src={category.image}
              alt=""
              sizes="(min-width: 768px) 22vw, 46vw"
              className="aspect-[4/3]"
            />
            <span className="flex items-center justify-between gap-2 border-t border-ink-600/70 px-4 py-3.5 text-[0.95rem] font-semibold">
              {category.name}
              <ArrowIcon className="size-4 shrink-0 text-mist-400 transition group-hover:-translate-x-1 group-hover:text-paper" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

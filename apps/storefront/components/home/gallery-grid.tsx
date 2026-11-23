import type { StoreGalleryItem } from "@bonanza/types"
import Image from "next/image"
import { getT } from "@/lib/i18n/server"

/** A grid of work photographs, cropped to one portrait shape so rows stay even. */
export function GalleryGrid({
  items,
  columns = "grid-cols-2 lg:grid-cols-4",
  sizes = "(min-width: 1024px) 24vw, 48vw",
  captions = false,
}: {
  items: StoreGalleryItem[]
  columns?: string
  sizes?: string
  captions?: boolean
}) {
  const t = getT()
  return (
    <ul className={`grid gap-3 sm:gap-5 ${columns}`}>
      {items.map((item) => (
        <li key={item.id}>
          <figure className="group/work">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-ink-600/70 bg-ink-850">
              <Image
                src={item.image_url}
                alt={item.alt || item.caption || t.gallery.imageAlt}
                fill
                sizes={sizes}
                className="object-cover transition duration-500 group-hover/work:scale-[1.04]"
              />
            </div>
            {captions && item.caption && (
              <figcaption className="mt-2 text-sm text-mist-300">
                {item.caption}
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  )
}

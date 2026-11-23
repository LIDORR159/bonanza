"use client"

import clsx from "clsx"
import Image from "next/image"
import { useState } from "react"
import { useT } from "@/components/i18n/locale-provider"
import { ProductImage } from "./product-image"

/** The main product image with a row of thumbnails beneath it. */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const t = useT()
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0] ?? null

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-ink-600/70">
        <ProductImage
          src={current}
          alt={title}
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="aspect-square"
        />
      </div>
      {images.length > 1 && (
        <ul aria-label={t.product.gallery} className="mt-3 grid grid-cols-5 gap-2.5">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                aria-label={t.product.showImage(index + 1)}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                className={clsx(
                  "product-well relative block aspect-square w-full overflow-hidden rounded-md border-2 transition",
                  index === active
                    ? "border-paper"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-contain p-[12%]"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

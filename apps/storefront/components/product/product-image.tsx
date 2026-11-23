"use client"

import clsx from "clsx"
import Image from "next/image"
import { useT } from "@/components/i18n/locale-provider"

/**
 * A product image on the grey well from the reference designs. The image is
 * contained, never cropped, so cut-out shots and full-frame photos both work.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
  padded = true,
}: {
  src: string | null | undefined
  alt: string
  sizes: string
  priority?: boolean
  className?: string
  padded?: boolean
}) {
  const t = useT()
  return (
    <div className={clsx("product-well relative overflow-hidden", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={clsx(
            "object-contain transition-transform duration-500 ease-out group-hover:scale-[1.05]",
            padded && "p-[9%]"
          )}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-ink-700">
          {t.product.noImage}
        </span>
      )}
    </div>
  )
}

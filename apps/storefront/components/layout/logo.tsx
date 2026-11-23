import Image from "next/image"
import Link from "next/link"
import { t } from "@/lib/i18n"

/**
 * The BONANZA lockup, straight from the supplied logo file: the wordmark with
 * its arched top edge and level baseline, the subtitle and the barber pole.
 * It is only ever resized here, never restyled.
 */
const WIDTH = 1822
const HEIGHT = 735

export function Logo({
  className,
  priority,
  linked = true,
}: {
  /** Sets the rendered height; the width follows. */
  className?: string
  priority?: boolean
  linked?: boolean
}) {
  const image = (
    <Image
      src="/brand/bonanza-lockup-720.webp"
      alt={`${t.brand.name} ${t.brand.tagline}`}
      width={WIDTH}
      height={HEIGHT}
      priority={priority}
      unoptimized
      className={className ?? "h-14 w-auto"}
    />
  )
  if (!linked) {
    return image
  }
  return (
    <Link href="/" aria-label={`${t.brand.name}, ${t.common.home}`} className="block shrink-0">
      {image}
    </Link>
  )
}

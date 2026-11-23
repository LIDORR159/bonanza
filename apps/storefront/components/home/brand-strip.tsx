import type { StoreBrand } from "@bonanza/types"
import Image from "next/image"
import Link from "next/link"

/** Brand tiles: the logo when one is uploaded, otherwise the name set as a wordmark. */
export function BrandStrip({ brands }: { brands: StoreBrand[] }) {
  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-600/70 bg-ink-600/70 sm:grid-cols-4">
      {brands.map((brand) => (
        <li key={brand.id} className="bg-ink-850">
          <Link
            href={`/brands/${brand.handle}`}
            className="flex h-24 items-center justify-center px-5 text-mist-300 transition hover:bg-ink-800 hover:text-paper sm:h-28"
          >
            {brand.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={brand.name}
                width={160}
                height={56}
                className="max-h-12 w-auto object-contain opacity-80 grayscale transition hover:opacity-100"
              />
            ) : (
              <bdi className="text-center text-lg font-extrabold uppercase tracking-[0.14em]">
                {brand.name}
              </bdi>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

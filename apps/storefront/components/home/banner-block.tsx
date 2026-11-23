import type { StoreBanner } from "@bonanza/types"
import Image from "next/image"
import { ButtonLink } from "@/components/ui/button"

/** A wide promotional panel. Shows the banner's image when it has one. */
export function BannerBlock({ banner }: { banner: StoreBanner }) {
  return (
    <div className="grain relative isolate overflow-hidden rounded-xl border border-ink-600/70 bg-ink-800">
      {banner.image_url ? (
        <>
          <picture>
            {banner.mobile_image_url && (
              <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />
            )}
            <Image
              src={banner.image_url}
              alt={banner.image_alt ?? ""}
              fill
              sizes="(min-width: 1280px) 1152px, 100vw"
              className="-z-10 object-cover"
            />
          </picture>
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink-950/90 via-ink-950/55 to-transparent" />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_8%_50%,rgb(255_255_255/0.12),transparent_70%)]"
        />
      )}
      <div className="flex min-h-56 flex-col items-start justify-center gap-4 p-7 sm:p-12 lg:max-w-[62%]">
        <h2 className="text-3xl sm:text-4xl">{banner.title}</h2>
        {banner.subtitle && (
          <p className="max-w-lg text-lg text-mist-300">{banner.subtitle}</p>
        )}
        {banner.target_url && banner.cta_label && (
          <ButtonLink href={banner.target_url} className="mt-2">
            {banner.cta_label}
          </ButtonLink>
        )}
      </div>
    </div>
  )
}

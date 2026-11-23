import type { StoreHomepageSection } from "@bonanza/types"
import Image from "next/image"
import { ButtonLink } from "@/components/ui/button"

/**
 * The editorial block from the second reference: sage ground, a large serif
 * line in off-white, and a dark panel beside it. The panel shows the section's
 * image, or the brand lockup when none is set.
 */
export function AcademySection({ section }: { section: StoreHomepageSection }) {
  return (
    <section className="bg-sage text-ink-950">
      <div className="container-site grid items-center gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] lg:py-24">
        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-sm bg-ink-900 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] md:justify-self-start">
          {section.image_url ? (
            <Image
              src={section.image_url}
              alt={section.image_alt ?? ""}
              fill
              sizes="(min-width: 768px) 32vw, 90vw"
              className="object-cover grayscale"
            />
          ) : (
            <div className="grain absolute inset-0 flex items-center justify-center bg-[radial-gradient(80%_60%_at_50%_35%,rgb(255_255_255/0.14),transparent_70%)] p-9">
              <Image
                src="/brand/bonanza-lockup-720.webp"
                alt=""
                width={1822}
                height={735}
                unoptimized
                className="h-auto w-full"
              />
            </div>
          )}
        </div>

        <div>
          {section.subtitle && (
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-ink-800">
              <bdi>{section.subtitle}</bdi>
            </p>
          )}
          <h2 className="font-serif text-4xl font-medium leading-[1.15] text-sage-ink sm:text-5xl lg:text-6xl">
            <span aria-hidden="true" className="block h-[0.55em] text-[1.6em] leading-none">
              ”
            </span>
            {section.title}
          </h2>
          {section.body && (
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-800">{section.body}</p>
          )}
          {section.cta && (
            <ButtonLink
              href={section.cta.url}
              size="lg"
              className="mt-8 !bg-ink-950 !text-paper hover:!bg-ink-800"
            >
              {section.cta.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  )
}

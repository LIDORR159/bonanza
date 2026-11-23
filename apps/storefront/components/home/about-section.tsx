import type { StoreHomepageSection } from "@bonanza/types"
import Image from "next/image"
import { ButtonLink } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"

/** Shown until a photograph of the shop is uploaded in the admin. */
const DEFAULT_IMAGE = "/home/about.jpg"

/**
 * The shop's story beside the photograph of the shop front. The title is set
 * as a quotation, in the serif face; the body is one paragraph per blank-line
 * separated block of the text entered in the admin.
 */
export function AboutSection({ section }: { section: StoreHomepageSection }) {
  const t = getT()
  const paragraphs = (section.body ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-md md:mx-0">
        <div
          aria-hidden="true"
          className="absolute -bottom-3 -start-3 end-6 top-6 rounded-xl border border-ink-500/70"
        />
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-raised">
          <Image
            src={section.image_url || DEFAULT_IMAGE}
            alt={section.image_alt ?? ""}
            fill
            sizes="(min-width: 768px) 36vw, 92vw"
            className="object-cover"
          />
        </div>
      </div>

      <div>
        {section.subtitle && <p className="eyebrow mb-4">{section.subtitle}</p>}
        <h2 className="font-serif text-3xl font-medium leading-[1.3] sm:text-4xl sm:leading-[1.3] lg:text-[2.6rem]">
          {section.title || t.about.fallbackTitle}
        </h2>
        {paragraphs.length > 0 && (
          <div className="mt-7 max-w-xl space-y-4 text-lg leading-relaxed text-mist-300">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        )}
        {section.cta && (
          <ButtonLink href={section.cta.url} variant="secondary" className="mt-8">
            {section.cta.label}
          </ButtonLink>
        )}
      </div>
    </div>
  )
}

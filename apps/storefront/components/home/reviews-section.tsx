import type {
  StoreHomepageSection,
  StoreReview,
  StoreReviewSummary,
} from "@bonanza/types"
import { ExternalIcon } from "@/components/ui/icons"
import { Stars } from "@/components/ui/stars"
import { getT, intlCode } from "@/lib/i18n/server"

/**
 * What customers wrote, with the business's overall score. Reviews are copied
 * in by hand in the admin, so each one shown here is a real one the owner
 * chose; the link leads to the full list on Google.
 */
export function ReviewsSection({
  section,
  reviews,
  summary,
}: {
  section: StoreHomepageSection
  reviews: StoreReview[]
  summary: StoreReviewSummary
}) {
  const t = getT()
  const rating =
    summary.rating != null
      ? summary.rating.toLocaleString(intlCode(), {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : null

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="eyebrow mb-2">{section.subtitle || t.reviews.google}</p>
          <h2 className="text-3xl sm:text-4xl">{section.title || t.reviews.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {rating && summary.rating != null && (
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black leading-none" dir="ltr">
                {rating}
              </span>
              <span>
                <Stars
                  rating={summary.rating}
                  label={t.reviews.ratingLabel(rating)}
                  className="size-5"
                />
                {summary.count != null && (
                  <span className="mt-1 block text-sm text-mist-300">
                    {t.reviews.basedOn(summary.count)}
                  </span>
                )}
              </span>
            </div>
          )}
          {summary.url && (
            <a
              href={summary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-mist-200 underline-offset-4 hover:text-paper hover:underline"
            >
              {t.reviews.readAll}
              <ExternalIcon className="size-4" />
            </a>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <figure className="flex h-full flex-col rounded-xl border border-ink-600/80 bg-ink-850 p-6 shadow-card">
                <div>
                  <Stars rating={review.rating} label={t.reviews.stars(review.rating)} />
                </div>
                <blockquote className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-mist-200">
                  <p className="whitespace-pre-line">
                    <bdi>{review.text}</bdi>
                  </p>
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-600 font-bold text-paper"
                  >
                    {review.author_name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-paper">
                      <bdi>{review.author_name}</bdi>
                    </span>
                    {review.date_label && (
                      <span className="block text-sm text-mist-400">
                        {review.date_label}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

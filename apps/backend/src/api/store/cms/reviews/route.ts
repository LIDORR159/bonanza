import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreReview, toStoreReviewSummary } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { isPreviewRequest, limitParam } from "../_shared"

/**
 * Published reviews in display order, with the overall score kept in the site
 * settings. `?limit=` caps the list.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [reviews, [settings]] = await Promise.all([
    listLocalized(req, "review", {
      filters: isPreviewRequest(req) ? {} : { status: "published" },
      order: { rank: "ASC" },
      take: limitParam(req, 100),
    }),
    listLocalized(req, "site_setting", {
      fields: ["id", "google_rating", "google_review_count", "google_reviews_url"],
      take: 1,
    }),
  ])
  res.json({ reviews: reviews.map(toStoreReview), summary: toStoreReviewSummary(settings) })
}

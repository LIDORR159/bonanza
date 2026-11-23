import { model } from "@medusajs/framework/utils"
import { PUBLISH_STATUSES, REVIEW_SOURCES } from "../constants"

/**
 * A customer review, copied in by hand from where it was written. The text is
 * the customer's own words, so it is not translatable.
 */
const Review = model
  .define("review", {
    id: model.id({ prefix: "rev" }).primaryKey(),
    author_name: model.text(),
    /** 1 to 5. */
    rating: model.number(),
    text: model.text(),
    /** Free text such as "a month ago". */
    date_label: model.text().translatable().nullable(),
    source: model.enum([...REVIEW_SOURCES]).default("google"),
    rank: model.number().default(0),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["rank"] }])
  .checks([
    {
      name: "review_rating_range",
      expression: (columns) => `${columns.rating} >= 1 AND ${columns.rating} <= 5`,
    },
  ])

export default Review

import { model } from "@medusajs/framework/utils"
import { NEWSLETTER_STATUSES } from "../constants"

const NewsletterSubscriber = model
  .define("newsletter_subscriber", {
    id: model.id({ prefix: "nlsub" }).primaryKey(),
    email: model.text().searchable(),
    status: model.enum([...NEWSLETTER_STATUSES]).default("subscribed"),
    /** When the visitor ticked the consent box. */
    consented_at: model.dateTime(),
    /** Where the sign-up came from, e.g. `footer`. */
    source: model.text().nullable(),
  })
  .indexes([{ on: ["email"], unique: true, where: "deleted_at IS NULL" }])

export default NewsletterSubscriber

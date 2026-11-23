import { model } from "@medusajs/framework/utils"
import { PUBLISH_STATUSES } from "../constants"

/**
 * A free-form page (about, contact, policies, academy). The body is Markdown.
 */
const ContentPage = model
  .define("content_page", {
    id: model.id({ prefix: "page" }).primaryKey(),
    /** URL path segment: `/about`. */
    slug: model.text(),
    title: model.text().translatable(),
    body: model.text().translatable().default(""),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    /** With status `published`: hidden until this moment. */
    publish_at: model.dateTime().nullable(),
    /** When the page first went public. */
    published_at: model.dateTime().nullable(),
    meta_title: model.text().translatable().nullable(),
    meta_description: model.text().translatable().nullable(),
    canonical_url: model.text().nullable(),
    og_image_url: model.text().nullable(),
    include_in_sitemap: model.boolean().default(true),
    /** Incremented on every save. */
    revision: model.number().default(1),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["slug"], unique: true, where: "deleted_at IS NULL" }])

export default ContentPage

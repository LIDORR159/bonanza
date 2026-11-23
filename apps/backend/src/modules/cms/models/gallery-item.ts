import { model } from "@medusajs/framework/utils"
import { PUBLISH_STATUSES } from "../constants"

/** One photograph of the gallery page. Featured ones also show on the home page. */
const GalleryItem = model
  .define("gallery_item", {
    id: model.id({ prefix: "gal" }).primaryKey(),
    image_url: model.text(),
    alt: model.text().translatable().nullable(),
    caption: model.text().translatable().nullable(),
    is_featured: model.boolean().default(false),
    rank: model.number().default(0),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["rank"] }])

export default GalleryItem

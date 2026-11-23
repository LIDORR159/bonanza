import { model } from "@medusajs/framework/utils"
import { BANNER_PLACEMENTS } from "../constants"

/**
 * A promotional banner. Shown while enabled and inside its optional
 * `starts_at` / `ends_at` window.
 */
const Banner = model
  .define("banner", {
    id: model.id({ prefix: "ban" }).primaryKey(),
    placement: model.enum([...BANNER_PLACEMENTS]).default("home_primary"),
    title: model.text().translatable(),
    subtitle: model.text().translatable().nullable(),
    image_url: model.text().nullable(),
    mobile_image_url: model.text().nullable(),
    image_alt: model.text().translatable().nullable(),
    target_url: model.text().nullable(),
    cta_label: model.text().translatable().nullable(),
    starts_at: model.dateTime().nullable(),
    ends_at: model.dateTime().nullable(),
    is_enabled: model.boolean().default(false),
    rank: model.number().default(0),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["placement", "rank"] }])

export default Banner

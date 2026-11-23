import { model } from "@medusajs/framework/utils"
import { HOMEPAGE_SECTION_TYPES, PUBLISH_STATUSES } from "../constants"

/**
 * One block of the storefront home page. The page is the list of visible,
 * published sections ordered by `rank`.
 */
const HomepageSection = model
  .define("homepage_section", {
    id: model.id({ prefix: "hsec" }).primaryKey(),
    type: model.enum([...HOMEPAGE_SECTION_TYPES]),
    /** Stable handle such as `best-sellers`; used for anchors. */
    key: model.text(),
    title: model.text().translatable().nullable(),
    subtitle: model.text().translatable().nullable(),
    body: model.text().translatable().nullable(),
    image_url: model.text().nullable(),
    mobile_image_url: model.text().nullable(),
    image_alt: model.text().translatable().nullable(),
    cta_label: model.text().translatable().nullable(),
    cta_url: model.text().nullable(),
    secondary_cta_label: model.text().translatable().nullable(),
    secondary_cta_url: model.text().nullable(),
    /** Type-specific options: product source, limit, banner placement. */
    settings: model.json().nullable(),
    rank: model.number().default(0),
    is_visible: model.boolean().default(true),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    /** With status `published`: hidden until this moment. */
    publish_at: model.dateTime().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    { on: ["key"], unique: true, where: "deleted_at IS NULL" },
    { on: ["rank"] },
  ])

export default HomepageSection

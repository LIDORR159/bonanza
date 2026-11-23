import { model } from "@medusajs/framework/utils"

/**
 * Site-wide settings. There is a single row; the service creates it on first
 * read.
 */
const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "site" }).primaryKey(),
  store_name: model.text().translatable().default("BONANZA"),
  tagline: model.text().translatable().nullable(),
  title_template: model.text().default("%s | BONANZA"),
  default_meta_title: model.text().translatable().default("BONANZA"),
  default_meta_description: model.text().translatable().nullable(),
  default_og_image_url: model.text().nullable(),
  contact_phone: model.text().nullable(),
  contact_whatsapp: model.text().nullable(),
  contact_email: model.text().nullable(),
  address: model.text().translatable().nullable(),
  /**
   * One row per line, written `days | hours`. A line without `|` is shown as
   * a note.
   */
  opening_hours: model.text().translatable().nullable(),
  /** Where "book an appointment" buttons lead: an external booking page. */
  booking_url: model.text().nullable(),
  /** `src` of a Google Maps embed. */
  map_embed_url: model.text().nullable(),
  /** Link that opens the location in a maps app. */
  map_link_url: model.text().nullable(),
  google_reviews_url: model.text().nullable(),
  /** The overall Google score, e.g. 4.9. Entered by hand. */
  google_rating: model.float().nullable(),
  google_review_count: model.number().nullable(),
  instagram_url: model.text().nullable(),
  facebook_url: model.text().nullable(),
  tiktok_url: model.text().nullable(),
  youtube_url: model.text().nullable(),
  newsletter_enabled: model.boolean().default(true),
  /** Display only. The shipping price itself is set on the shipping option. */
  free_shipping_threshold: model.number().nullable(),
  updated_by: model.text().nullable(),
})

export default SiteSetting

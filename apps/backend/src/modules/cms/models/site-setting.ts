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
  opening_hours: model.text().translatable().nullable(),
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

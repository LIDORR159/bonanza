import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreSettings } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"

/** What the storefront shows before anyone has saved the settings in the admin. */
const DEFAULTS = {
  store_name: "BONANZA",
  title_template: "%s | BONANZA",
  default_meta_title: "BONANZA",
  newsletter_enabled: false,
  free_shipping_threshold: null,
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [settings] = await listLocalized(req, "site_setting", { take: 1 })
  res.json({ settings: toStoreSettings(settings ?? DEFAULTS) })
}

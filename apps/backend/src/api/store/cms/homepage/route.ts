import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toStoreSection } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { isPreviewRequest } from "../_shared"

/** The home page: visible, published sections in display order. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const preview = isPreviewRequest(req)
  const sections = await listLocalized(req, "homepage_section", {
    filters: preview ? {} : { is_visible: true, status: "published" },
    order: { rank: "ASC" },
  })
  res.json({
    sections: sections
      .filter((section) => preview || isLive(section))
      .map(toStoreSection),
  })
}

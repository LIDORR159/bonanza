import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toStoreServiceGroup } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { isPreviewRequest } from "../_shared"

/** The price list: published groups in display order, each with its visible items. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const preview = isPreviewRequest(req)
  const groups = await listLocalized(req, "service_group", {
    fields: ["*", "items.*"],
    filters: preview ? {} : { status: "published" },
    order: { rank: "ASC" },
  })
  res.json({
    service_groups: groups
      .filter((group) => preview || isLive(group))
      .map((group) => toStoreServiceGroup(group, preview)),
  })
}

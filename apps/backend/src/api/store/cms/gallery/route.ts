import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreGalleryItem } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { isPreviewRequest, limitParam } from "../_shared"

/**
 * Published gallery photographs in display order. `?featured=true` returns
 * only the ones chosen for the home page; `?limit=` caps the list.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const preview = isPreviewRequest(req)
  const items = await listLocalized(req, "gallery_item", {
    filters: {
      ...(preview ? {} : { status: "published" }),
      ...(req.query.featured === "true" ? { is_featured: true } : {}),
    },
    order: { rank: "ASC" },
    take: limitParam(req, 200),
  })
  res.json({ gallery_items: items.map(toStoreGalleryItem) })
}

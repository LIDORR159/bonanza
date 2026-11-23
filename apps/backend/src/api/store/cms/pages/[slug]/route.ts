import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { isLive, toStorePage } from "../../../../../lib/content"
import { listLocalized } from "../../../../../lib/localized"
import { isPreviewRequest } from "../../_shared"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [page] = await listLocalized(req, "content_page", {
    filters: { slug: req.params.slug },
    take: 1,
  })
  const preview = isPreviewRequest(req)
  const live = !!page && isLive(page)

  // A draft answers exactly like a page that does not exist.
  if (!page || (!preview && !live)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found.")
  }
  res.json({ page: toStorePage(page, preview && !live) })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { isLive, toStorePage } from "../../../../../lib/content"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { isPreviewRequest } from "../../_shared"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const [page] = await cms.listContentPages({ slug: req.params.slug }, { take: 1 })
  const preview = isPreviewRequest(req)

  // A draft answers exactly like a page that does not exist.
  if (!page || (!preview && !isLive(page))) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found.")
  }
  res.json({ page: toStorePage(page, preview && !isLive(page)) })
}

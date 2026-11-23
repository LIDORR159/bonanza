import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toStoreSection } from "../../../../lib/content"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { isPreviewRequest } from "../_shared"

/** The home page: visible, published sections in display order. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const preview = isPreviewRequest(req)
  const sections = await cms.listHomepageSections(
    preview ? {} : { is_visible: true, status: "published" },
    { order: { rank: "ASC" }, take: 100 }
  )
  res.json({
    sections: sections
      .filter((section) => preview || isLive(section))
      .map(toStoreSection),
  })
}

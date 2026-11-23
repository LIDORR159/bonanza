import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toStorePageSummary } from "../../../../lib/content"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

/** Every public page, without its body. Used for the sitemap and static paths. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const pages = await cms.listContentPages(
    { status: "published" },
    { order: { slug: "ASC" }, take: 500 }
  )
  res.json({ pages: pages.filter((page) => isLive(page)).map(toStorePageSummary) })
}

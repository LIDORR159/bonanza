import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isBannerActive, toStoreBanner } from "../../../../lib/content"
import { CMS_MODULE } from "../../../../modules/cms"
import { BANNER_PLACEMENTS } from "../../../../modules/cms/constants"
import type CmsModuleService from "../../../../modules/cms/service"
import { isPreviewRequest } from "../_shared"

/** Banners that are enabled and inside their date window. `?placement=` narrows the list. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const preview = isPreviewRequest(req)
  const placement = (BANNER_PLACEMENTS as readonly string[]).includes(
    String(req.query.placement)
  )
    ? (req.query.placement as (typeof BANNER_PLACEMENTS)[number])
    : undefined

  const banners = await cms.listBanners(
    { ...(placement ? { placement } : {}), ...(preview ? {} : { is_enabled: true }) },
    { order: { rank: "ASC" }, take: 100 }
  )
  res.json({
    banners: banners.filter((banner) => preview || isBannerActive(banner)).map(toStoreBanner),
  })
}

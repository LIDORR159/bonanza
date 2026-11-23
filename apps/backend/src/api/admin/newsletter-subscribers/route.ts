import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import { pagination } from "../cms/_crud"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const { limit, offset } = pagination(req.query, 50)
  const filters = typeof req.query.q === "string" && req.query.q ? { q: req.query.q } : {}
  const [subscribers, count] = await cms.listAndCountNewsletterSubscribers(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })
  res.json({ subscribers, count, limit, offset })
}

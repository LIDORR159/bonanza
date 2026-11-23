import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { saveCmsRecordWorkflow } from "../../../../workflows/cms/save-cms-record"

/** The site settings are a single record. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const [settings] = await cms.listSiteSettings({}, { take: 1 })
  res.json({ settings: settings ?? null })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<Record<string, unknown>>,
  res: MedusaResponse
) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const [existing] = await cms.listSiteSettings({}, { take: 1, select: ["id"] })
  const { result } = await saveCmsRecordWorkflow(req.scope).run({
    input: {
      entity: "site_setting",
      id: existing?.id,
      data: req.validatedBody,
      actor_id: req.auth_context?.actor_id,
    },
  })
  res.json({ settings: result })
}

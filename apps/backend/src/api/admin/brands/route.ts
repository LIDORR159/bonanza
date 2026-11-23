import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import { saveBrandWorkflow } from "../../../workflows/brand/save-brand"
import type { SaveBrandInput } from "../../../workflows/brand/steps"
import { pagination } from "../cms/_crud"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { limit, offset } = pagination(req.query)
  const filters = typeof req.query.q === "string" && req.query.q ? { q: req.query.q } : {}
  const [records, count] = await brands.listAndCountBrands(filters, {
    take: limit,
    skip: offset,
    order: { rank: "ASC", name: "ASC" },
  })
  res.json({ brands: records, count, limit, offset })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<SaveBrandInput["data"]>,
  res: MedusaResponse
) => {
  const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const [existing] = await brands.listBrands(
    { handle: req.validatedBody.handle },
    { take: 1, select: ["id"] }
  )
  if (existing) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Another brand already uses the handle "${req.validatedBody.handle}".`
    )
  }
  const { result } = await saveBrandWorkflow(req.scope).run({
    input: { data: req.validatedBody, actor_id: req.auth_context?.actor_id },
  })
  res.status(201).json({ brand: result })
}

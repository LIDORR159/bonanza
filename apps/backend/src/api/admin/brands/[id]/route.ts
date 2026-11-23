import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../modules/brand"
import type BrandModuleService from "../../../../modules/brand/service"
import { deleteBrandWorkflow } from "../../../../workflows/brand/delete-brand"
import { saveBrandWorkflow } from "../../../../workflows/brand/save-brand"
import type { SaveBrandInput } from "../../../../workflows/brand/steps"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  res.json({ brand: await brands.retrieveBrand(req.params.id) })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<SaveBrandInput["data"]>,
  res: MedusaResponse
) => {
  if (req.validatedBody.handle) {
    const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const [existing] = await brands.listBrands(
      { handle: req.validatedBody.handle },
      { take: 1, select: ["id"] }
    )
    if (existing && existing.id !== req.params.id) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Another brand already uses the handle "${req.validatedBody.handle}".`
      )
    }
  }
  const { result } = await saveBrandWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      data: req.validatedBody,
      actor_id: req.auth_context?.actor_id,
    },
  })
  res.json({ brand: result })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  await deleteBrandWorkflow(req.scope).run({
    input: { id: req.params.id, actor_id: req.auth_context?.actor_id },
  })
  res.json({ id: req.params.id, object: "brand", deleted: true })
}

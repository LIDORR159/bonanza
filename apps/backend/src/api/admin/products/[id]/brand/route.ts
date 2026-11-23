import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { setProductBrandWorkflow } from "../../../../../workflows/brand/set-product-brand"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "brand.id", "brand.name", "brand.handle", "brand.logo_url"],
    filters: { id: req.params.id },
  })
  res.json({ brand: (data[0] as { brand?: unknown } | undefined)?.brand ?? null })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<{ brand_id: string | null }>,
  res: MedusaResponse
) => {
  const { result } = await setProductBrandWorkflow(req.scope).run({
    input: { product_id: req.params.id, brand_id: req.validatedBody.brand_id },
  })
  res.json(result)
}

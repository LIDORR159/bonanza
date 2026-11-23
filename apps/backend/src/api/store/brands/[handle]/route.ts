import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { toStoreBrand } from "../../../../lib/content"
import { BRAND_MODULE } from "../../../../modules/brand"
import type BrandModuleService from "../../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const [brand] = await brands.listBrands({ handle: req.params.handle }, { take: 1 })
  if (!brand) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Brand not found.")
  }
  res.json({ brand: toStoreBrand(brand) })
}

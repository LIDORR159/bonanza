import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreBrand } from "../../../lib/content"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"

/** All brands. `?featured=true` returns only the ones marked as featured. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brands: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const records = await brands.listBrands(
    req.query.featured === "true" ? { is_featured: true } : {},
    { order: { rank: "ASC", name: "ASC" }, take: 500 }
  )
  res.json({ brands: records.map(toStoreBrand) })
}

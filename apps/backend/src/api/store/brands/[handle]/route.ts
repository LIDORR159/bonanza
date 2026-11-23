import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { toStoreBrand } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [brand] = await listLocalized(req, "brand", {
    filters: { handle: req.params.handle },
    take: 1,
  })
  if (!brand) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Brand not found.")
  }
  res.json({ brand: toStoreBrand(brand) })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreBrand } from "../../../lib/content"
import { listLocalized } from "../../../lib/localized"

/** All brands. `?featured=true` returns only the ones marked as featured. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brands = await listLocalized(req, "brand", {
    filters: req.query.featured === "true" ? { is_featured: true } : {},
    order: { rank: "ASC", name: "ASC" },
    take: 500,
  })
  res.json({ brands: brands.map(toStoreBrand) })
}

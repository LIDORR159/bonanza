import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toStorePageSummary } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"

/** Every public page, without its body. Used for the sitemap and static paths. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pages = await listLocalized(req, "content_page", {
    fields: ["id", "slug", "title", "status", "publish_at", "include_in_sitemap", "updated_at"],
    filters: { status: "published" },
    order: { slug: "ASC" },
    take: 500,
  })
  res.json({
    pages: pages
      .filter((page) => isLive(page))
      .map(toStorePageSummary),
  })
}

import type { MedusaRequest } from "@medusajs/framework/http"
import { verifySignedToken } from "../../../lib/signing"

/**
 * True when the request carries a valid, unexpired preview token minted by
 * `POST /admin/cms/preview-token`. Only then do the content routes include
 * drafts and scheduled content.
 */
export function isPreviewRequest(req: MedusaRequest): boolean {
  const token = req.headers["x-cms-preview-token"]
  const claims = verifySignedToken<{ scope: string }>(
    process.env.CMS_PREVIEW_SECRET || "",
    typeof token === "string" ? token : null
  )
  return claims?.scope === "cms-preview"
}

/** `?limit=` as a whole number between 1 and `max`; `max` when absent or invalid. */
export function limitParam(req: MedusaRequest, max: number): number {
  const limit = Math.floor(Number(req.query.limit))
  return Number.isFinite(limit) && limit >= 1 ? Math.min(limit, max) : max
}

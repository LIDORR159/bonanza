import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { storefrontUrl } from "../../../../lib/env"
import { createSignedToken } from "../../../../lib/signing"

const PREVIEW_TTL_SECONDS = 30 * 60

/**
 * Returns a link that shows unpublished content on the storefront for the next
 * thirty minutes. Anyone holding the link can see the drafts until it expires,
 * so it is only handed to signed-in staff.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<{ path: string }>,
  res: MedusaResponse
) => {
  const secret = process.env.CMS_PREVIEW_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Content preview is not configured (CMS_PREVIEW_SECRET is not set)."
    )
  }
  const token = createSignedToken(secret, { scope: "cms-preview" }, PREVIEW_TTL_SECONDS)
  const url = new URL("/api/preview", storefrontUrl())
  url.searchParams.set("token", token)
  url.searchParams.set("path", req.validatedBody.path)
  res.json({ url: url.toString(), expires_in: PREVIEW_TTL_SECONDS })
}

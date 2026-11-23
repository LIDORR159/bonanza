import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toStoreTeamMember } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { isPreviewRequest } from "../_shared"

/** The barbers shown on the gallery page, in display order. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const members = await listLocalized(req, "team_member", {
    filters: isPreviewRequest(req) ? {} : { status: "published" },
    order: { rank: "ASC" },
  })
  res.json({ team_members: members.map(toStoreTeamMember) })
}

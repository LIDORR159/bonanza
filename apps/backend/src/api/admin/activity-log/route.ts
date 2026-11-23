import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTIVITY_LOG_MODULE } from "../../../modules/activity-log"
import type ActivityLogModuleService from "../../../modules/activity-log/service"
import { pagination } from "../cms/_crud"

/** Read-only. Entries are written by workflows and subscribers, never by a route. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const activityLog: ActivityLogModuleService = req.scope.resolve(ACTIVITY_LOG_MODULE)
  const { limit, offset } = pagination(req.query, 50)
  const filters: Record<string, string> = {}
  for (const field of ["resource_type", "resource_id", "actor_id", "action"]) {
    if (typeof req.query[field] === "string" && req.query[field]) {
      filters[field] = req.query[field] as string
    }
  }
  const [entries, count] = await activityLog.listAndCountActivityLogEntries(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })
  res.json({ entries, count, limit, offset })
}

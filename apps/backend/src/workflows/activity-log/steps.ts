import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ACTIVITY_LOG_MODULE } from "../../modules/activity-log"
import type ActivityLogModuleService from "../../modules/activity-log/service"

export type ActivityInput = {
  actor_type: "user" | "customer" | "system"
  actor_id?: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  summary?: string | null
  details?: Record<string, unknown> | null
}

export const recordActivityStep = createStep(
  "record-activity",
  async (input: ActivityInput, { container }) => {
    const activityLog: ActivityLogModuleService = container.resolve(ACTIVITY_LOG_MODULE)
    const entry = await activityLog.createActivityLogEntries(input)
    return new StepResponse(entry, entry.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const activityLog: ActivityLogModuleService = container.resolve(ACTIVITY_LOG_MODULE)
    await activityLog.deleteActivityLogEntries(id)
  }
)

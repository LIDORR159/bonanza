import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { recordActivityStep } from "../activity-log/steps"
import { CMS_CHANGED_EVENT, summaryOf, type CmsEntity } from "./entities"
import { deleteCmsRecordStep } from "./steps"

type Input = { entity: CmsEntity; id: string; actor_id?: string | null }

export const deleteCmsRecordWorkflow = createWorkflow(
  "delete-cms-record",
  function (input: Input) {
    const deleted = deleteCmsRecordStep({ entity: input.entity, id: input.id })

    const activity = transform({ input, deleted }, ({ input, deleted }) => ({
      actor_type: "user" as const,
      actor_id: input.actor_id ?? null,
      action: `cms.${input.entity}.deleted`,
      resource_type: input.entity,
      resource_id: input.id,
      summary: summaryOf(deleted),
      details: null,
    }))
    recordActivityStep(activity)

    const eventData = transform({ input, deleted }, ({ input, deleted }) => ({
      entity: input.entity,
      id: input.id,
      slug: (deleted.slug ?? null) as string | null,
    }))
    emitEventStep({ eventName: CMS_CHANGED_EVENT, data: eventData })

    return new WorkflowResponse({ id: input.id, deleted: true })
  }
)

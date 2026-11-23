import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { recordActivityStep } from "../activity-log/steps"
import { CMS_CHANGED_EVENT, type CmsEntity } from "./entities"
import { reorderCmsRecordsStep } from "./steps"

type Input = { entity: CmsEntity; ids: string[]; actor_id?: string | null }

/** Sets display order: the first id comes first. */
export const reorderCmsRecordsWorkflow = createWorkflow(
  "reorder-cms-records",
  function (input: Input) {
    const result = reorderCmsRecordsStep({ entity: input.entity, ids: input.ids })

    const activity = transform({ input }, ({ input }) => ({
      actor_type: "user" as const,
      actor_id: input.actor_id ?? null,
      action: `cms.${input.entity}.reordered`,
      resource_type: input.entity,
      resource_id: null,
      summary: null,
      details: { count: input.ids.length },
    }))
    recordActivityStep(activity)

    const eventData = transform({ input }, ({ input }) => ({
      entity: input.entity,
      id: null,
      slug: null,
    }))
    emitEventStep({ eventName: CMS_CHANGED_EVENT, data: eventData })

    return new WorkflowResponse(result)
  }
)

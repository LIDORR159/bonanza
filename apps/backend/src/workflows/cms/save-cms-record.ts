import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { recordActivityStep } from "../activity-log/steps"
import { CMS_CHANGED_EVENT } from "./entities"
import { saveCmsRecordStep, type SaveCmsRecordInput } from "./steps"

/**
 * Creates or updates one content record, records who did it, and announces
 * the change so the storefront refreshes its cached pages.
 */
export const saveCmsRecordWorkflow = createWorkflow(
  "save-cms-record",
  function (input: SaveCmsRecordInput) {
    const saved = saveCmsRecordStep(input)

    const activity = transform({ input, saved }, ({ input, saved }) => ({
      actor_type: "user" as const,
      actor_id: input.actor_id ?? null,
      action: `cms.${input.entity}.${saved.created ? "created" : "updated"}`,
      resource_type: input.entity,
      resource_id: saved.record.id as string,
      summary: (saved.record.title ??
        saved.record.label ??
        saved.record.key ??
        saved.record.store_name ??
        null) as string | null,
      // Field names only. Content itself stays out of the log.
      details: { fields: Object.keys(input.data) },
    }))
    recordActivityStep(activity)

    const eventData = transform({ input, saved }, ({ input, saved }) => ({
      entity: input.entity,
      id: saved.record.id as string,
      slug: (saved.record.slug ?? null) as string | null,
    }))
    emitEventStep({ eventName: CMS_CHANGED_EVENT, data: eventData })

    const record = transform({ saved }, ({ saved }) => saved.record)
    return new WorkflowResponse(record)
  }
)

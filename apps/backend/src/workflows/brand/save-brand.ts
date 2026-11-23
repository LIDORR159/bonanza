import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { recordActivityStep } from "../activity-log/steps"
import { CMS_CHANGED_EVENT } from "../cms/entities"
import { saveBrandStep, type SaveBrandInput } from "./steps"

export const saveBrandWorkflow = createWorkflow(
  "save-brand",
  function (input: SaveBrandInput) {
    const saved = saveBrandStep(input)

    const activity = transform({ input, saved }, ({ input, saved }) => ({
      actor_type: "user" as const,
      actor_id: input.actor_id ?? null,
      action: `brand.${saved.created ? "created" : "updated"}`,
      resource_type: "brand",
      resource_id: saved.brand.id,
      summary: saved.brand.name,
      details: { fields: Object.keys(input.data) },
    }))
    recordActivityStep(activity)

    const eventData = transform({ saved }, ({ saved }) => ({
      entity: "brand",
      id: saved.brand.id,
      slug: saved.brand.handle,
    }))
    emitEventStep({ eventName: CMS_CHANGED_EVENT, data: eventData })

    const brand = transform({ saved }, ({ saved }) => saved.brand)
    return new WorkflowResponse(brand)
  }
)

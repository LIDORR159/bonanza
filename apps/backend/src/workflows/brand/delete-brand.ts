import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  dismissRemoteLinkStep,
  emitEventStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { BRAND_MODULE } from "../../modules/brand"
import { recordActivityStep } from "../activity-log/steps"
import { CMS_CHANGED_EVENT } from "../cms/entities"
import { deleteBrandStep } from "./steps"

type Input = { id: string; actor_id?: string | null }

/** Deletes a brand and detaches it from its products. Products are kept. */
export const deleteBrandWorkflow = createWorkflow(
  "delete-brand",
  function (input: Input) {
    const { data: brands } = useQueryGraphStep({
      entity: "brand",
      fields: ["id", "products.id"],
      filters: { id: input.id },
    })

    const links = transform({ brands, input }, ({ brands, input }) =>
      ((brands[0]?.products ?? []) as { id: string }[]).map((product) => ({
        [Modules.PRODUCT]: { product_id: product.id },
        [BRAND_MODULE]: { brand_id: input.id },
      }))
    )
    dismissRemoteLinkStep(links)

    const deleted = deleteBrandStep({ id: input.id })

    const activity = transform({ input, deleted }, ({ input, deleted }) => ({
      actor_type: "user" as const,
      actor_id: input.actor_id ?? null,
      action: "brand.deleted",
      resource_type: "brand",
      resource_id: input.id,
      summary: deleted.name,
      details: null,
    }))
    recordActivityStep(activity)

    const eventData = transform({ input, deleted }, ({ input, deleted }) => ({
      entity: "brand",
      id: input.id,
      slug: deleted.handle,
    }))
    emitEventStep({ eventName: CMS_CHANGED_EVENT, data: eventData })

    return new WorkflowResponse({ id: input.id, deleted: true })
  }
)

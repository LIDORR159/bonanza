import { Modules, ProductWorkflowEvents } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createRemoteLinkStep,
  dismissRemoteLinkStep,
  emitEventStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { BRAND_MODULE } from "../../modules/brand"

type Input = { product_id: string; brand_id: string | null }

/**
 * Sets, changes or clears a product's brand. A product has at most one brand,
 * so any existing link is removed first.
 */
export const setProductBrandWorkflow = createWorkflow(
  "set-product-brand",
  function (input: Input) {
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["id", "brand.id"],
      filters: { id: input.product_id },
      options: { throwIfKeyNotFound: true },
    })

    const existing = transform({ products, input }, ({ products, input }) => {
      const current = (products[0] as { brand?: { id: string } | null }).brand
      return current?.id
        ? [
            {
              [Modules.PRODUCT]: { product_id: input.product_id },
              [BRAND_MODULE]: { brand_id: current.id },
            },
          ]
        : []
    })
    dismissRemoteLinkStep(existing)

    when("attach-brand", { input }, ({ input }) => !!input.brand_id).then(() => {
      const link = transform({ input }, ({ input }) => [
        {
          [Modules.PRODUCT]: { product_id: input.product_id },
          [BRAND_MODULE]: { brand_id: input.brand_id as string },
        },
      ])
      createRemoteLinkStep(link)
    })

    // The brand is part of the product's search document and of its cached
    // storefront pages; both follow this event.
    const eventData = transform({ input }, ({ input }) => ({ id: input.product_id }))
    emitEventStep({ eventName: ProductWorkflowEvents.UPDATED, data: eventData })

    return new WorkflowResponse({ product_id: input.product_id, brand_id: input.brand_id })
  }
)

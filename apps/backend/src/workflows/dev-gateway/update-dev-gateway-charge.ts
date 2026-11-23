import { createWorkflow, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  sendDevGatewayWebhookStep,
  updateDevGatewayChargeStep,
  type DevGatewayChargeUpdate,
} from "./steps"

type Input = {
  id: string
  update: DevGatewayChargeUpdate
  /** Send the merchant a webhook after the change. */
  notify?: boolean
}

export const updateDevGatewayChargeWorkflow = createWorkflow(
  "update-dev-gateway-charge",
  function (input: Input) {
    const charge = updateDevGatewayChargeStep({ id: input.id, update: input.update })

    when("notify-merchant", { input }, ({ input }) => input.notify === true).then(() => {
      sendDevGatewayWebhookStep({ id: charge.id })
    })

    return new WorkflowResponse(charge)
  }
)

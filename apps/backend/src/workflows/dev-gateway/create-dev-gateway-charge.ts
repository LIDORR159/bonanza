import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createDevGatewayChargeStep, type DevGatewayChargeInput } from "./steps"

export const createDevGatewayChargeWorkflow = createWorkflow(
  "create-dev-gateway-charge",
  function (input: DevGatewayChargeInput) {
    const charge = createDevGatewayChargeStep(input)
    return new WorkflowResponse(charge)
  }
)

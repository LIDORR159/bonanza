import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { defineFileConfig, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isDevPaymentEnabled } from "../../../../lib/env"
import { DEV_GATEWAY_MODULE } from "../../../../modules/dev-gateway"
import type DevGatewayModuleService from "../../../../modules/dev-gateway/service"
import { updateDevGatewayChargeWorkflow } from "../../../../workflows/dev-gateway/update-dev-gateway-charge"
import { assertGatewayKey, toChargeResponse } from "../../_shared"

export const AUTHENTICATE = false

defineFileConfig({ isDisabled: () => !isDevPaymentEnabled() })

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  assertGatewayKey(req)
  const gateway: DevGatewayModuleService = req.scope.resolve(DEV_GATEWAY_MODULE)
  const charge = await gateway.retrieveDevGatewayCharge(req.params.id)
  res.json(toChargeResponse(charge))
}

const UpdateCharge = z.object({ amount: z.number().positive() })

/** Changes the amount of a charge the shopper has not paid yet. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  assertGatewayKey(req)
  const parsed = UpdateCharge.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.message)
  }
  const gateway: DevGatewayModuleService = req.scope.resolve(DEV_GATEWAY_MODULE)
  const charge = await gateway.retrieveDevGatewayCharge(req.params.id)
  if (charge.status !== "pending") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `A ${charge.status} charge cannot change amount.`
    )
  }
  const { result } = await updateDevGatewayChargeWorkflow(req.scope).run({
    input: { id: charge.id, update: { amount: parsed.data.amount } },
  })
  res.json(toChargeResponse(result))
}

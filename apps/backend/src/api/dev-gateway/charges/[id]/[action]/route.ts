import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { defineFileConfig, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isDevPaymentEnabled } from "../../../../../lib/env"
import { DEV_GATEWAY_MODULE } from "../../../../../modules/dev-gateway"
import type DevGatewayModuleService from "../../../../../modules/dev-gateway/service"
import type { DevGatewayChargeUpdate } from "../../../../../workflows/dev-gateway/steps"
import { updateDevGatewayChargeWorkflow } from "../../../../../workflows/dev-gateway/update-dev-gateway-charge"
import { assertGatewayKey, toChargeResponse } from "../../../_shared"

export const AUTHENTICATE = false

defineFileConfig({ isDisabled: () => !isDevPaymentEnabled() })

const Refund = z.object({ amount: z.number().positive() })

/** POST /dev-gateway/charges/:id/capture | refund | cancel */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  assertGatewayKey(req)
  const gateway: DevGatewayModuleService = req.scope.resolve(DEV_GATEWAY_MODULE)
  const charge = await gateway.retrieveDevGatewayCharge(req.params.id)
  const amount = Number(charge.amount)
  const captured = Number(charge.captured_amount)
  const refunded = Number(charge.refunded_amount)

  let update: DevGatewayChargeUpdate

  switch (req.params.action) {
    case "capture": {
      if (charge.status !== "approved") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Only an approved charge can be captured."
        )
      }
      update = { captured_amount: amount }
      break
    }
    case "refund": {
      const parsed = Refund.safeParse(req.body)
      if (!parsed.success) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.message)
      }
      if (parsed.data.amount > captured - refunded + 0.0001) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Refund exceeds the captured amount."
        )
      }
      update = { refunded_amount: refunded + parsed.data.amount }
      break
    }
    case "cancel": {
      if (captured > 0) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "A captured charge must be refunded, not canceled."
        )
      }
      update = { status: "canceled" }
      break
    }
    default:
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Unknown charge action.")
  }

  const { result } = await updateDevGatewayChargeWorkflow(req.scope).run({
    input: { id: charge.id, update },
  })
  res.json(toChargeResponse(result))
}

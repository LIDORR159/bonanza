import { randomBytes } from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { defineFileConfig, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isDevPaymentEnabled } from "../../../lib/env"
import { createDevGatewayChargeWorkflow } from "../../../workflows/dev-gateway/create-dev-gateway-charge"
import { assertGatewayKey, toChargeResponse } from "../_shared"

export const AUTHENTICATE = false

defineFileConfig({ isDisabled: () => !isDevPaymentEnabled() })

const CreateCharge = z.object({
  reference: z.string().min(1),
  amount: z.number().positive(),
  currency_code: z.string().length(3),
  capture: z.boolean().default(true),
  webhook_url: z.string().url(),
  return_url: z.string().url(),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  assertGatewayKey(req)
  const parsed = CreateCharge.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.message)
  }
  const { capture, ...input } = parsed.data

  const { result } = await createDevGatewayChargeWorkflow(req.scope).run({
    input: {
      ...input,
      capture_on_approval: capture,
      page_token: randomBytes(24).toString("hex"),
    },
  })
  res.status(201).json(toChargeResponse(result))
}

import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { sign } from "../../lib/signing"
import { DEV_GATEWAY_MODULE } from "../../modules/dev-gateway"
import type DevGatewayModuleService from "../../modules/dev-gateway/service"

export type DevGatewayChargeInput = {
  reference: string
  amount: number
  currency_code: string
  capture_on_approval: boolean
  page_token: string
  webhook_url: string
  return_url: string
}

export type DevGatewayChargeUpdate = Partial<{
  amount: number
  status: "pending" | "approved" | "declined" | "canceled"
  captured_amount: number
  refunded_amount: number
}>

export const createDevGatewayChargeStep = createStep(
  "create-dev-gateway-charge",
  async (input: DevGatewayChargeInput, { container }) => {
    const gateway: DevGatewayModuleService = container.resolve(DEV_GATEWAY_MODULE)
    const charge = await gateway.createDevGatewayCharges(input)
    return new StepResponse(charge, charge.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const gateway: DevGatewayModuleService = container.resolve(DEV_GATEWAY_MODULE)
    await gateway.deleteDevGatewayCharges(id)
  }
)

export const updateDevGatewayChargeStep = createStep(
  "update-dev-gateway-charge",
  async (input: { id: string; update: DevGatewayChargeUpdate }, { container }) => {
    const gateway: DevGatewayModuleService = container.resolve(DEV_GATEWAY_MODULE)
    const before = await gateway.retrieveDevGatewayCharge(input.id)
    const charge = await gateway.updateDevGatewayCharges({ id: input.id, ...input.update })
    return new StepResponse(charge, {
      id: before.id,
      amount: Number(before.amount),
      status: before.status,
      captured_amount: Number(before.captured_amount),
      refunded_amount: Number(before.refunded_amount),
    })
  },
  async (before, { container }) => {
    if (!before) {
      return
    }
    const gateway: DevGatewayModuleService = container.resolve(DEV_GATEWAY_MODULE)
    await gateway.updateDevGatewayCharges(before)
  }
)

/**
 * Tells the merchant backend that a charge changed, the way a real gateway
 * does: a server-to-server POST carrying a timestamp and an HMAC of
 * `<timestamp>.<body>`.
 */
export const sendDevGatewayWebhookStep = createStep(
  { name: "send-dev-gateway-webhook", maxRetries: 2, retryInterval: 2 },
  async (input: { id: string }, { container }) => {
    const gateway: DevGatewayModuleService = container.resolve(DEV_GATEWAY_MODULE)
    const charge = await gateway.retrieveDevGatewayCharge(input.id)
    const secret = process.env.PAYMENT_DEV_WEBHOOK_SECRET
    if (!secret) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "PAYMENT_DEV_WEBHOOK_SECRET is not set."
      )
    }

    const body = JSON.stringify({
      type: `charge.${charge.status}`,
      charge_id: charge.id,
      reference: charge.reference,
    })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = await fetch(charge.webhook_url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "bonanza-dev-gateway/1.0",
        "x-dev-gateway-timestamp": timestamp,
        "x-dev-gateway-signature": sign(secret, `${timestamp}.${body}`),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Webhook delivery failed with status ${response.status}`
      )
    }
    return new StepResponse({ delivered: true })
  }
)

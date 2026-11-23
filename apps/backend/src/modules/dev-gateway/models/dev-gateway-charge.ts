import { model } from "@medusajs/framework/utils"

export const DEV_GATEWAY_CHARGE_STATUSES = [
  "pending",
  "approved",
  "declined",
  "canceled",
] as const

/**
 * A charge held by the simulated payment gateway. This table stands in for the
 * records a real gateway keeps on its own servers.
 */
const DevGatewayCharge = model.define("dev_gateway_charge", {
  id: model.id({ prefix: "dgch" }).primaryKey(),
  /** The merchant's own reference: the Medusa payment session id. */
  reference: model.text(),
  amount: model.bigNumber(),
  currency_code: model.text(),
  status: model.enum([...DEV_GATEWAY_CHARGE_STATUSES]).default("pending"),
  /** True: approving also charges. False: approving only authorizes. */
  capture_on_approval: model.boolean().default(true),
  captured_amount: model.bigNumber().default(0),
  refunded_amount: model.bigNumber().default(0),
  /** Random value required to open the hosted payment page. */
  page_token: model.text(),
  webhook_url: model.text(),
  return_url: model.text(),
})

export default DevGatewayCharge

import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { backendUrl } from "../../lib/env"
import { signaturesMatch, sign } from "../../lib/signing"

type Charge = {
  id: string
  reference: string
  amount: unknown
  currency_code: string
  status: string
  captured_amount: unknown
  refunded_amount: unknown
  page_token: string
}

/** The gateway's REST API accepts only the shared secret as a bearer token. */
export function assertGatewayKey(req: MedusaRequest): void {
  const secret = process.env.PAYMENT_DEV_WEBHOOK_SECRET || ""
  const header = String(req.headers.authorization || "")
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  // Compare digests so the comparison is constant-time and length-independent.
  if (!secret || !signaturesMatch(sign(secret, secret), sign(secret, token))) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid gateway API key.")
  }
}

export function toChargeResponse(charge: Charge) {
  return {
    id: charge.id,
    reference: charge.reference,
    amount: Number(charge.amount),
    currency_code: charge.currency_code,
    status: charge.status,
    captured_amount: Number(charge.captured_amount),
    refunded_amount: Number(charge.refunded_amount),
    // The public URL: this is where the shopper's browser is sent.
    payment_url: `${backendUrl()}/dev-gateway/pay/${charge.id}?t=${charge.page_token}`,
  }
}

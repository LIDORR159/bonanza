import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { sign, signaturesMatch } from "../../lib/signing"

type Options = {
  /** Where this provider reaches the gateway's REST API. */
  gatewayUrl: string
  /** Where the gateway sends its webhooks: this backend's /hooks/payment route. */
  webhookUrl: string
  /** Where the gateway sends the shopper after the payment page. */
  returnUrl: string
  /** Shared secret: authenticates API calls and signs webhooks. */
  secret: string
  /** `automatic` charges on approval; `manual` only authorizes. */
  captureMode?: "automatic" | "manual"
}

type GatewayCharge = {
  id: string
  reference: string
  amount: number
  currency_code: string
  status: "pending" | "approved" | "declined" | "canceled"
  captured_amount: number
  refunded_amount: number
  payment_url: string
}

/** A webhook older or newer than this is rejected, which limits replays. */
const WEBHOOK_TOLERANCE_SECONDS = 300

const toNumber = (value: unknown): number => new BigNumber(value as number).numeric

/**
 * Payment provider for the simulated hosted-page gateway
 * (src/modules/dev-gateway). It follows the flow the Israeli gateways use:
 *
 *   1. initiatePayment creates a charge and returns the hosted page URL
 *   2. the shopper pays on the gateway's page
 *   3. the gateway calls our webhook, server to server
 *   4. we verify the signature, then ask the gateway for the charge state
 *      rather than trusting the webhook body
 *
 * The browser returning to the storefront plays no part in confirming payment.
 */
class DevHostedPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "dev-hosted"

  protected readonly logger_: Logger
  protected readonly options_: Options

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["gatewayUrl", "webhookUrl", "returnUrl", "secret"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Dev payment provider: option "${key}" is required.`
        )
      }
    }
  }

  constructor(cradle: { logger: Logger }, options: Options) {
    super(cradle, options)
    this.logger_ = cradle.logger
    this.options_ = options
  }

  private async gateway<T = GatewayCharge>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.options_.gatewayUrl}/dev-gateway${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.options_.secret}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Dev gateway ${method} ${path} failed with status ${response.status}`
      )
    }
    return (await response.json()) as T
  }

  private chargeId(data?: Record<string, unknown>): string {
    const id = data?.charge_id
    if (typeof id !== "string" || !id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment session has no gateway charge id."
      )
    }
    return id
  }

  private toStatus(charge: GatewayCharge): PaymentSessionStatus {
    switch (charge.status) {
      case "approved":
        return charge.captured_amount >= charge.amount
          ? PaymentSessionStatus.CAPTURED
          : PaymentSessionStatus.AUTHORIZED
      case "declined":
        return PaymentSessionStatus.ERROR
      case "canceled":
        return PaymentSessionStatus.CANCELED
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  /** What is stored on the Medusa payment session. Nothing sensitive. */
  private toData(charge: GatewayCharge): Record<string, unknown> {
    return {
      charge_id: charge.id,
      payment_url: charge.payment_url,
      gateway_status: charge.status,
      captured_amount: charge.captured_amount,
      refunded_amount: charge.refunded_amount,
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const charge = await this.gateway("POST", "/charges", {
      // Medusa passes the payment session id; it is how the webhook finds its
      // way back to the right session.
      reference: input.data?.session_id,
      amount: toNumber(input.amount),
      currency_code: input.currency_code,
      capture: (this.options_.captureMode ?? "automatic") === "automatic",
      webhook_url: this.options_.webhookUrl,
      return_url: this.options_.returnUrl,
    })
    return {
      id: charge.id,
      status: PaymentSessionStatus.PENDING,
      data: this.toData(charge),
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const charge = await this.gateway("POST", `/charges/${this.chargeId(input.data)}`, {
      amount: toNumber(input.amount),
    })
    return { status: this.toStatus(charge), data: this.toData(charge) }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const id = input.data?.charge_id
    if (typeof id === "string" && id) {
      await this.gateway("POST", `/charges/${id}/cancel`)
    }
    return { data: input.data }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    // Always asks the gateway. A storefront calling "complete cart" before the
    // shopper has paid gets `pending` here, so no order is created.
    const charge = await this.gateway("GET", `/charges/${this.chargeId(input.data)}`)
    return { status: this.toStatus(charge), data: this.toData(charge) }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const charge = await this.gateway("GET", `/charges/${this.chargeId(input.data)}`)
    return { status: this.toStatus(charge), data: this.toData(charge) }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const charge = await this.gateway("GET", `/charges/${this.chargeId(input.data)}`)
    return { data: this.toData(charge) }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const charge = await this.gateway("POST", `/charges/${this.chargeId(input.data)}/capture`)
    return { data: this.toData(charge) }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const charge = await this.gateway(
      "POST",
      `/charges/${this.chargeId(input.data)}/refund`,
      { amount: toNumber(input.amount) }
    )
    return { data: this.toData(charge) }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const charge = await this.gateway("POST", `/charges/${this.chargeId(input.data)}/cancel`)
    return { data: this.toData(charge) }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const headers = payload.headers as Record<string, string | string[] | undefined>
    const signature = String(headers["x-dev-gateway-signature"] ?? "")
    const timestamp = String(headers["x-dev-gateway-timestamp"] ?? "")
    const rawBody =
      typeof payload.rawData === "string"
        ? payload.rawData
        : Buffer.isBuffer(payload.rawData)
          ? payload.rawData.toString("utf8")
          : JSON.stringify(payload.data)

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
    const expected = sign(this.options_.secret, `${timestamp}.${rawBody}`)
    if (
      !Number.isFinite(age) ||
      age > WEBHOOK_TOLERANCE_SECONDS ||
      !signaturesMatch(expected, signature)
    ) {
      this.logger_.warn("Dev gateway webhook rejected: bad signature or timestamp")
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    // The signature proves who sent it. The charge state still comes from the
    // gateway's API, never from the webhook body.
    const charge = await this.gateway(
      "GET",
      `/charges/${String((payload.data as Record<string, unknown>)?.charge_id)}`
    )
    const data = { session_id: charge.reference, amount: charge.amount }

    switch (this.toStatus(charge)) {
      case PaymentSessionStatus.CAPTURED:
        return { action: PaymentActions.SUCCESSFUL, data }
      case PaymentSessionStatus.AUTHORIZED:
        return { action: PaymentActions.AUTHORIZED, data }
      case PaymentSessionStatus.ERROR:
        return { action: PaymentActions.FAILED, data }
      case PaymentSessionStatus.CANCELED:
        return { action: PaymentActions.CANCELED, data }
      default:
        return { action: PaymentActions.PENDING, data }
    }
  }
}

export default DevHostedPaymentProviderService

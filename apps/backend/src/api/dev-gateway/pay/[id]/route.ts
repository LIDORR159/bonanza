import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { defineFileConfig, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isDevPaymentEnabled } from "../../../../lib/env"
import { signaturesMatch, sign } from "../../../../lib/signing"
import { DEV_GATEWAY_MODULE } from "../../../../modules/dev-gateway"
import type DevGatewayModuleService from "../../../../modules/dev-gateway/service"
import type { DevGatewayChargeUpdate } from "../../../../workflows/dev-gateway/steps"
import { updateDevGatewayChargeWorkflow } from "../../../../workflows/dev-gateway/update-dev-gateway-charge"

/**
 * The simulated gateway's hosted payment page: what the shopper sees after
 * being redirected away from the storefront. It has no card fields because no
 * card is involved; the three buttons stand for the three outcomes a real page
 * can produce.
 */
export const AUTHENTICATE = false
export const CORS = false

defineFileConfig({ isDisabled: () => !isDevPaymentEnabled() })

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  )

async function loadCharge(req: MedusaRequest, token: unknown) {
  const gateway: DevGatewayModuleService = req.scope.resolve(DEV_GATEWAY_MODULE)
  const charge = await gateway.retrieveDevGatewayCharge(req.params.id).catch(() => null)
  const secret = process.env.PAYMENT_DEV_WEBHOOK_SECRET || ""
  if (
    !charge ||
    typeof token !== "string" ||
    !signaturesMatch(sign(secret, charge.page_token), sign(secret, token))
  ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payment page not found.")
  }
  return charge
}

const returnUrl = (base: string, chargeId: string, outcome: string) =>
  `${base}${base.includes("?") ? "&" : "?"}charge=${encodeURIComponent(chargeId)}&outcome=${outcome}`

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const charge = await loadCharge(req, req.query.t)
  const amount = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: charge.currency_code.toUpperCase(),
  }).format(Number(charge.amount))

  const settled = charge.status !== "pending"
  const outcomeOf: Record<string, string> = {
    approved: "approved",
    declined: "declined",
    canceled: "canceled",
  }

  res.setHeader("content-type", "text/html; charset=utf-8")
  res.setHeader("cache-control", "no-store")
  res.setHeader("x-robots-tag", "noindex")
  res.send(`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>דף תשלום לבדיקות</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
         background: #0d0e0f; color: #f4f4f2; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 420px; background: #17181a; border: 1px solid #2a2c2f; border-radius: 10px; padding: 28px; }
  .notice { background: #2a2410; border: 1px solid #5c4d14; color: #f1d98a; border-radius: 6px; padding: 10px 12px; font-size: 14px; }
  h1 { font-size: 20px; margin: 20px 0 4px; }
  .amount { font-size: 34px; font-weight: 800; margin: 4px 0 20px; }
  .ref { color: #9a9c9f; font-size: 13px; direction: ltr; text-align: right; overflow-wrap: anywhere; }
  .actions { display: grid; gap: 10px; margin-top: 24px; }
  button { font: inherit; font-weight: 600; padding: 12px 16px; border-radius: 6px; cursor: pointer; border: 1px solid #3a3c40; background: transparent; color: inherit; }
  button.primary { background: #f4f4f2; color: #0d0e0f; border-color: #f4f4f2; }
  button:focus-visible { outline: 2px solid #f4f4f2; outline-offset: 2px; }
  button[disabled] { opacity: .5; cursor: progress; }
  .error { color: #ff9b9b; min-height: 1.5em; margin: 12px 0 0; font-size: 14px; }
</style>
</head>
<body>
<main>
  <p class="notice"><strong>סביבת בדיקות.</strong> לא מתבצע חיוב אמיתי ואין להזין פרטי כרטיס.</p>
  <h1>סכום לתשלום</h1>
  <p class="amount"><bdi>${escapeHtml(amount)}</bdi></p>
  <p class="ref">${escapeHtml(charge.id)}</p>
  ${
    settled
      ? `<p>העסקה כבר טופלה.</p>
  <div class="actions"><a href="${escapeHtml(returnUrl(charge.return_url, charge.id, outcomeOf[charge.status] ?? "pending"))}"><button class="primary" type="button">חזרה לחנות</button></a></div>`
      : `<div class="actions">
    <button class="primary" type="button" data-outcome="approved">אישור תשלום</button>
    <button type="button" data-outcome="declined">דחיית הכרטיס</button>
    <button type="button" data-outcome="canceled">ביטול וחזרה לחנות</button>
  </div>
  <p class="error" role="alert" id="error"></p>`
  }
</main>
<script>
  const token = new URLSearchParams(location.search).get("t");
  const buttons = document.querySelectorAll("button[data-outcome]");
  for (const button of buttons) {
    button.addEventListener("click", async () => {
      buttons.forEach((b) => (b.disabled = true));
      try {
        const response = await fetch(location.pathname, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ t: token, outcome: button.dataset.outcome }),
        });
        if (!response.ok) throw new Error(String(response.status));
        location.assign((await response.json()).redirect_url);
      } catch (error) {
        document.getElementById("error").textContent = "הפעולה נכשלה. נסו שוב.";
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  }
</script>
</body>
</html>`)
}

const Submit = z.object({
  t: z.string().min(1),
  outcome: z.enum(["approved", "declined", "canceled"]),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = Submit.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid request.")
  }
  const charge = await loadCharge(req, parsed.data.t)
  const { outcome } = parsed.data

  // Submitting twice (double click, back button) must not change a settled charge.
  if (charge.status === "pending") {
    const update: DevGatewayChargeUpdate = { status: outcome }
    if (outcome === "approved" && charge.capture_on_approval) {
      update.captured_amount = Number(charge.amount)
    }
    await updateDevGatewayChargeWorkflow(req.scope).run({
      input: { id: charge.id, update, notify: true },
    })
  }

  res.json({
    redirect_url: returnUrl(
      charge.return_url,
      charge.id,
      charge.status === "pending" ? outcome : charge.status
    ),
  })
}

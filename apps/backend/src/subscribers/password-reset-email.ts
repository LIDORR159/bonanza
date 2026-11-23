import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { backendUrl, storefrontUrl } from "../lib/env"
import { passwordResetEmail } from "../lib/emails/password-reset"
import { sendEmail } from "../lib/emails/send"

type Payload = { entity_id: string; actor_type: string; token: string }

/**
 * Emails the reset link when a customer or an admin user asks to reset a
 * password. The token is single-use and short-lived; it is never logged.
 */
export default async function passwordResetEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<Payload>) {
  const base =
    data.actor_type === "customer"
      ? `${storefrontUrl()}/account/reset-password`
      : `${backendUrl()}/app/reset-password`
  const url = `${base}?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.entity_id)}`

  await sendEmail(container, {
    to: data.entity_id,
    template: "password-reset",
    email: passwordResetEmail(url),
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}

import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type Email = { subject: string; html: string; text: string }

/**
 * Sends one transactional email. When no email provider is configured
 * (SMTP_HOST empty) it logs a warning and returns: a missing mail server must
 * not fail the order or password-reset flow that triggered the email.
 */
export async function sendEmail(
  container: MedusaContainer,
  input: { to: string; template: string; email: Email; idempotency_key?: string }
): Promise<boolean> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!process.env.SMTP_HOST) {
    logger.warn(`Email "${input.template}" not sent: no SMTP server is configured.`)
    return false
  }
  const notifications = container.resolve(Modules.NOTIFICATION)
  await notifications.createNotifications({
    to: input.to,
    channel: "email",
    template: input.template,
    content: input.email,
    idempotency_key: input.idempotency_key,
  })
  return true
}

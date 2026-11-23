"use server"

import { isEmail } from "../format"
import { t } from "../i18n"
import { privateFetch } from "./client"

export type NewsletterState = { status: "idle" | "success" | "error"; message?: string }

export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim()
  if (!isEmail(email)) {
    return { status: "error", message: t.checkout.errors.email }
  }
  if (formData.get("consent") !== "on") {
    return { status: "error", message: t.newsletter.consentRequired }
  }
  try {
    await privateFetch("/store/newsletter", {
      method: "POST",
      body: { email, consent: true, source: String(formData.get("source") ?? "home") },
    })
    return { status: "success", message: t.newsletter.success }
  } catch (error) {
    const status = (error as { status?: number }).status
    return {
      status: "error",
      message: status === 429 ? t.account.errors.tooManyAttempts : t.common.genericError,
    }
  }
}

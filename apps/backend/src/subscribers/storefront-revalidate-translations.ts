import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, TranslationWorkflowEvents } from "@medusajs/framework/utils"
import { requestRevalidation } from "../lib/revalidate"

/**
 * Refreshes the storefront's cached pages when English or Arabic text is
 * edited under Settings → Translations.
 *
 * The event carries only the translation's id, and a translation may belong to
 * site content, a product, a category or a brand, so every cached area is
 * refreshed. Saving a screen of translations emits one event per row; the
 * refresh call collects them into a single request.
 */
export default async function storefrontRevalidateTranslations({
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  requestRevalidation(logger, "cms", "products", "categories", "collections", "brands")
}

export const config: SubscriberConfig = {
  event: [
    TranslationWorkflowEvents.CREATED,
    TranslationWorkflowEvents.UPDATED,
    TranslationWorkflowEvents.DELETED,
  ],
}

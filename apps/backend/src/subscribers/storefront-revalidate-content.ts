import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requestRevalidation } from "../lib/revalidate"
import { CMS_CHANGED_EVENT } from "../workflows/cms/entities"

/** Refreshes the storefront's cached pages when site content or a brand changes. */
export default async function storefrontRevalidateContent({
  event,
  container,
}: SubscriberArgs<{ entity: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (event.data.entity === "brand") {
    requestRevalidation(logger, "brands", "products")
  } else {
    requestRevalidation(logger, "cms")
  }
}

export const config: SubscriberConfig = {
  event: CMS_CHANGED_EVENT,
}

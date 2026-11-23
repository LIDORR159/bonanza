import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requestRevalidation, type CacheTag } from "../lib/revalidate"

/** Refreshes the storefront's cached catalog pages when the catalog changes. */
export default async function storefrontRevalidateCatalog({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const tags: CacheTag[] = ["products"]
  if (event.name.startsWith("product-category.")) {
    tags.push("categories")
  }
  if (event.name.startsWith("product-collection.")) {
    tags.push("collections")
  }
  requestRevalidation(logger, ...tags)
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
  ],
}

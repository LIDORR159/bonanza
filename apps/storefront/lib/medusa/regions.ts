import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_COUNTRY } from "../config"
import { cachedFetch } from "./client"

/** The store's single sales region. Prices and taxes are calculated for it. */
export async function getRegion(): Promise<HttpTypes.StoreRegion> {
  const { regions } = await cachedFetch<{ regions: HttpTypes.StoreRegion[] }>("/store/regions", {
    tags: ["cms"],
    revalidate: 3600,
  })
  const region =
    regions.find((candidate) =>
      candidate.countries?.some((country) => country.iso_2 === DEFAULT_COUNTRY)
    ) ?? regions[0]
  if (!region) {
    throw new Error(`No sales region found for country "${DEFAULT_COUNTRY}".`)
  }
  return region
}

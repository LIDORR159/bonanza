import type { StoreSiteSettings } from "@bonanza/types"
import { normalizeIsraeliPhone } from "./format"

/**
 * Small readers for the business details kept in site settings: opening
 * hours, WhatsApp and the map.
 */

export type HoursRow = { days: string; hours: string | null }

/**
 * Opening hours are typed in the admin one row per line, `days | hours`.
 * A line without `|` is a note and has no hours.
 */
export function parseOpeningHours(text: string | null | undefined): HoursRow[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [days = "", ...rest] = line.split("|")
      const hours = rest.join("|").trim()
      return { days: days.trim(), hours: hours || null }
    })
}

/** A `wa.me` chat link, or null when no usable number is set. */
export function whatsappUrl(
  number: string | null | undefined,
  message?: string
): string | null {
  if (!number) {
    return null
  }
  const digits = (normalizeIsraeliPhone(number) ?? number).replace(/\D/g, "")
  if (digits.length < 8) {
    return null
  }
  const text = message ? `?text=${encodeURIComponent(message)}` : ""
  return `https://wa.me/${digits}${text}`
}

const isGoogleMapsUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      ["www.google.com", "maps.google.com", "google.com"].includes(url.hostname) &&
      url.pathname.startsWith("/maps")
    )
  } catch {
    return false
  }
}

/**
 * The address of the map shown in the footer. Only a Google Maps embed is
 * accepted, so a typo in the admin can never frame another site here. With no
 * embed set, the map is built from the address.
 */
export function mapEmbedUrl(
  settings: Pick<StoreSiteSettings, "map_embed_url" | "address">
): string | null {
  if (settings.map_embed_url && isGoogleMapsUrl(settings.map_embed_url)) {
    return settings.map_embed_url
  }
  const address = settings.address?.replace(/\s+/g, " ").trim()
  return address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null
}

/** Opens the location in the visitor's maps app. */
export function mapLinkUrl(
  settings: Pick<StoreSiteSettings, "map_link_url" | "address">
): string | null {
  if (settings.map_link_url) {
    return settings.map_link_url
  }
  const address = settings.address?.replace(/\s+/g, " ").trim()
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null
}

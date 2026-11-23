import { describe, expect, it } from "vitest"
import { mapEmbedUrl, mapLinkUrl, parseOpeningHours, whatsappUrl } from "./site"

describe("parseOpeningHours", () => {
  it("reads one row per line, split at the bar", () => {
    expect(
      parseOpeningHours("ראשון–חמישי | 09:00–20:00\nשישי | 08:00–14:00\nשבת | סגור")
    ).toEqual([
      { days: "ראשון–חמישי", hours: "09:00–20:00" },
      { days: "שישי", hours: "08:00–14:00" },
      { days: "שבת", hours: "סגור" },
    ])
  })

  it("treats a line without a bar as a note and skips blank lines", () => {
    expect(parseOpeningHours("\nבתיאום מראש\r\n\r\n")).toEqual([
      { days: "בתיאום מראש", hours: null },
    ])
    expect(parseOpeningHours(null)).toEqual([])
  })
})

describe("whatsappUrl", () => {
  it("builds a chat link from a local or international number", () => {
    expect(whatsappUrl("050-123-4567")).toBe("https://wa.me/972501234567")
    expect(whatsappUrl("+972501234567", "שלום")).toBe(
      "https://wa.me/972501234567?text=%D7%A9%D7%9C%D7%95%D7%9D"
    )
  })

  it("gives nothing when there is no usable number", () => {
    expect(whatsappUrl(null)).toBeNull()
    expect(whatsappUrl("")).toBeNull()
    expect(whatsappUrl("12")).toBeNull()
  })
})

describe("the footer map", () => {
  it("uses a Google Maps embed address as given", () => {
    const embed = "https://www.google.com/maps/embed?pb=!1m18"
    expect(mapEmbedUrl({ map_embed_url: embed, address: "הרצל 1, תל אביב" })).toBe(embed)
  })

  it("never frames another site: anything else falls back to the address", () => {
    for (const hostile of [
      "https://evil.example/maps",
      "http://www.google.com/maps/embed",
      "https://www.google.com/search?q=x",
      "javascript:alert(1)",
    ]) {
      expect(mapEmbedUrl({ map_embed_url: hostile, address: "הרצל 1" })).toBe(
        "https://www.google.com/maps?q=%D7%94%D7%A8%D7%A6%D7%9C%201&output=embed"
      )
      expect(mapEmbedUrl({ map_embed_url: hostile, address: null })).toBeNull()
    }
  })

  it("links to the address unless a link was set", () => {
    expect(mapLinkUrl({ map_link_url: null, address: "הרצל 1" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=%D7%94%D7%A8%D7%A6%D7%9C%201"
    )
    expect(
      mapLinkUrl({ map_link_url: "https://maps.app.goo.gl/x", address: "הרצל 1" })
    ).toBe("https://maps.app.goo.gl/x")
    expect(mapLinkUrl({ map_link_url: null, address: null })).toBeNull()
  })
})

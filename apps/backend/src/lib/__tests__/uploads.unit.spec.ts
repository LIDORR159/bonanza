import { ALLOWED_IMAGE_TYPES, sniffImageType } from "../uploads"

const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (text: string) => Array.from(Buffer.from(text, "latin1"))

describe("sniffImageType", () => {
  it("recognises each allowed format from its first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg")
    expect(sniffImageType(bytes(...ascii("\x89PNG\r\n\x1a\n"), 0, 0))).toBe("image/png")
    expect(sniffImageType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")))).toBe(
      "image/webp"
    )
    expect(sniffImageType(bytes(0, 0, 0, 0x1c, ...ascii("ftypavif")))).toBe("image/avif")
  })

  it("refuses files that only claim to be images", () => {
    const html = bytes(...ascii("<html><script>alert(1)</script>"))
    const svg = bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg">'))
    const gif = bytes(...ascii("GIF89a"))
    const executable = bytes(0x4d, 0x5a, 0x90, 0x00)
    for (const file of [html, svg, gif, executable, bytes()]) {
      expect(sniffImageType(file)).toBeNull()
    }
  })

  it("is not fooled by a RIFF container that is not WebP", () => {
    expect(
      sniffImageType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE")))
    ).toBeNull()
  })
})

describe("allowed image types", () => {
  it("leaves SVG out, because an SVG file can carry scripts", () => {
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/svg+xml")
    expect([...ALLOWED_IMAGE_TYPES].sort()).toEqual(
      ["image/avif", "image/jpeg", "image/png", "image/webp"].sort()
    )
  })
})

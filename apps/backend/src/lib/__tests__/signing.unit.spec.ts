import { createSignedToken, sign, signaturesMatch, verifySignedToken } from "../signing"

const SECRET = "a-test-secret"

describe("signaturesMatch", () => {
  const signature = sign(SECRET, "payload")

  it("accepts the exact signature, in either letter case", () => {
    expect(signaturesMatch(signature, signature)).toBe(true)
    expect(signaturesMatch(signature, signature.toUpperCase())).toBe(true)
  })

  it("refuses a signature with anything appended", () => {
    // Buffer.from(value, "hex") stops at the first non-hex character, so
    // without the length check these would compare equal to the original.
    expect(signaturesMatch(signature, `${signature}zz`)).toBe(false)
    expect(signaturesMatch(signature, `${signature}00`)).toBe(false)
    expect(signaturesMatch(signature, `${signature} `)).toBe(false)
  })

  it("refuses short, empty and different signatures", () => {
    expect(signaturesMatch(signature, signature.slice(0, 62))).toBe(false)
    expect(signaturesMatch(signature, "")).toBe(false)
    expect(signaturesMatch(signature, sign(SECRET, "other payload"))).toBe(false)
    expect(signaturesMatch(signature, sign("other secret", "payload"))).toBe(false)
  })
})

describe("signed tokens", () => {
  it("round-trips its claims and adds an expiry", () => {
    const token = createSignedToken(SECRET, { path: "/about" }, 60)
    const claims = verifySignedToken<{ path: string }>(SECRET, token)
    expect(claims?.path).toBe("/about")
    expect(claims!.exp).toBeGreaterThan(Date.now() / 1000)
  })

  it("is refused once expired", () => {
    expect(
      verifySignedToken(SECRET, createSignedToken(SECRET, { path: "/" }, -1))
    ).toBeNull()
  })

  it("is refused when signed with another secret", () => {
    expect(
      verifySignedToken("other", createSignedToken(SECRET, { path: "/" }, 60))
    ).toBeNull()
  })

  it("is refused when the claims were edited", () => {
    const [, signature] = createSignedToken(SECRET, { path: "/a" }, 60).split(".")
    const forged = Buffer.from(
      JSON.stringify({ path: "/b", exp: 9_999_999_999 })
    ).toString("base64url")
    expect(verifySignedToken(SECRET, `${forged}.${signature}`)).toBeNull()
  })

  it("is refused in every malformed shape", () => {
    const token = createSignedToken(SECRET, { path: "/" }, 60)
    for (const bad of [
      undefined,
      null,
      "",
      "abc",
      `${token}zz`,
      `${token}.extra`,
      `.${token}`,
    ]) {
      expect(verifySignedToken(SECRET, bad)).toBeNull()
    }
    expect(verifySignedToken("", token)).toBeNull()
  })
})

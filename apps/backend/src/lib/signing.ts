import { createHmac, timingSafeEqual } from "node:crypto"

/** Hex HMAC-SHA256 of `payload`. */
export function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

const SHA256_HEX = /^[0-9a-f]{64}$/

/**
 * Constant-time comparison of two hex SHA-256 signatures.
 *
 * Both sides must be exactly 64 hex characters. Without that check
 * `Buffer.from(value, "hex")` silently drops anything after the first non-hex
 * character, so a valid signature with junk appended would still compare equal.
 */
export function signaturesMatch(expected: string, received: string): boolean {
  const a = expected.toLowerCase()
  const b = received.toLowerCase()
  if (!SHA256_HEX.test(a) || !SHA256_HEX.test(b)) {
    return false
  }
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
}

/**
 * A compact signed token: `<base64url(json)>.<hmac>`. Used for short-lived
 * content preview links. Not a JWT on purpose: it carries one claim and one
 * algorithm, so there is nothing to negotiate.
 */
export function createSignedToken(
  secret: string,
  claims: Record<string, unknown>,
  ttlSeconds: number
): string {
  const body = Buffer.from(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString("base64url")
  return `${body}.${sign(secret, body)}`
}

export function verifySignedToken<T extends Record<string, unknown>>(
  secret: string,
  token: string | undefined | null
): (T & { exp: number }) | null {
  if (!secret || !token) {
    return null
  }
  const parts = token.split(".")
  const [body, signature] = parts
  if (
    parts.length !== 2 ||
    !body ||
    !signature ||
    !signaturesMatch(sign(secret, body), signature)
  ) {
    return null
  }
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return claims
  } catch {
    return null
  }
}

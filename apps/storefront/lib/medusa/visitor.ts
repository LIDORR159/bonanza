import "server-only"
import { createHmac } from "node:crypto"
import { headers } from "next/headers"

const IP_ADDRESS = /^[0-9a-fA-F:.]{3,45}$/

/**
 * A header that tells the backend which visitor a call is made for.
 *
 * The backend limits sign-in, registration, password reset and newsletter
 * attempts per address. Those calls are made by this server, so without this
 * header every visitor would be counted as one. The value is
 * `<time>|<address>|<signature>`, signed with the secret this server and the
 * backend share (REVALIDATE_SECRET); the backend ignores it unless the
 * signature is valid and recent (apps/backend/src/lib/rate-limit.ts).
 *
 * The visitor's address is taken from the headers the reverse proxy sets. In
 * production only the proxy can reach this server, and it overwrites them.
 */
export async function visitorHeaders(): Promise<Record<string, string>> {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return {}
  }
  try {
    const incoming = await headers()
    const address = (
      incoming.get("cf-connecting-ip") ??
      incoming.get("x-forwarded-for")?.split(",")[0] ??
      incoming.get("x-real-ip") ??
      ""
    ).trim()
    if (!IP_ADDRESS.test(address)) {
      return {}
    }
    const timestamp = Date.now()
    const signature = createHmac("sha256", secret)
      .update(`visitor|${timestamp}|${address}`)
      .digest("hex")
    return { "x-storefront-visitor": `${timestamp}|${address}|${signature}` }
  } catch {
    // Outside a request there is no visitor to name.
    return {}
  }
}

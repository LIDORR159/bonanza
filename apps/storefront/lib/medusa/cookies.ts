import "server-only"
import { cookies } from "next/headers"
import { IS_PRODUCTION } from "../config"

/**
 * The two cookies that tie a browser to its cart and its customer session.
 *
 * Both are httpOnly, so page scripts cannot read them. `sameSite: lax` (not
 * strict) is deliberate: the shopper comes back from the payment page through
 * a cross-site navigation, and a strict cookie would be withheld on it.
 */
const CART_COOKIE = "bnz_cart"
const AUTH_COOKIE = "bnz_session"
const WEEK = 60 * 60 * 24 * 7

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: IS_PRODUCTION,
  path: "/",
}

export async function getCartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value
}

export async function setCartId(id: string): Promise<void> {
  ;(await cookies()).set(CART_COOKIE, id, { ...base, maxAge: WEEK * 4 })
}

export async function clearCartId(): Promise<void> {
  ;(await cookies()).delete(CART_COOKIE)
}

export async function getAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE)?.value
}

export async function setAuthToken(token: string): Promise<void> {
  ;(await cookies()).set(AUTH_COOKIE, token, { ...base, maxAge: WEEK })
}

export async function clearAuthToken(): Promise<void> {
  ;(await cookies()).delete(AUTH_COOKIE)
}

/** The Authorization header for the signed-in customer, or nothing for a guest. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

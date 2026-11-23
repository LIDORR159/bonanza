"use server"

import { revalidatePath } from "next/cache"
import type { Dictionary } from "../i18n"
import { actionT } from "../i18n/action"
import { cartItemCount, retrieveCart } from "./cart-data"
import { errorMessage, sdk } from "./client"
import { authHeaders, getCartId, setCartId } from "./cookies"
import { getRegion } from "./regions"

/**
 * Cart mutations. Each one runs on the server, talks to Medusa, and returns a
 * small result for the interface. No price or total is ever computed here.
 */

export type CartActionResult = { ok: true; count: number } | { ok: false; error: string }

async function ensureCartId(): Promise<string> {
  const existing = await retrieveCart("id,completed_at")
  if (existing) {
    return existing.id
  }
  const region = await getRegion()
  const { cart } = await sdk.store.cart.create(
    { region_id: region.id },
    {},
    await authHeaders()
  )
  await setCartId(cart.id)
  return cart.id
}

const stockOrGeneric = (error: unknown, t: Dictionary): string => {
  const message = errorMessage(error, "")
  return /inventory|stock|quantity/i.test(message)
    ? t.cart.stockLimit
    : t.common.genericError
}

async function result(): Promise<CartActionResult> {
  revalidatePath("/[locale]/cart", "page")
  revalidatePath("/[locale]/checkout", "page")
  return {
    ok: true,
    count: cartItemCount(await retrieveCart("id,items.quantity,completed_at")),
  }
}

export async function addToCart(input: {
  variantId: string
  quantity: number
}): Promise<CartActionResult> {
  const t = await actionT()
  const quantity = Math.floor(input.quantity)
  if (!input.variantId || !Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false, error: t.common.genericError }
  }
  try {
    const cartId = await ensureCartId()
    await sdk.store.cart.createLineItem(
      cartId,
      { variant_id: input.variantId, quantity },
      {},
      await authHeaders()
    )
    return result()
  } catch (error) {
    return { ok: false, error: stockOrGeneric(error, t) }
  }
}

export async function updateLineItem(input: {
  lineId: string
  quantity: number
}): Promise<CartActionResult> {
  const t = await actionT()
  const cartId = await getCartId()
  const quantity = Math.floor(input.quantity)
  if (
    !cartId ||
    !input.lineId ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    quantity > 99
  ) {
    return { ok: false, error: t.common.genericError }
  }
  try {
    if (quantity === 0) {
      await sdk.store.cart.deleteLineItem(cartId, input.lineId, {}, await authHeaders())
    } else {
      await sdk.store.cart.updateLineItem(
        cartId,
        input.lineId,
        { quantity },
        {},
        await authHeaders()
      )
    }
    return result()
  } catch (error) {
    return { ok: false, error: stockOrGeneric(error, t) }
  }
}

export async function removeLineItem(lineId: string): Promise<CartActionResult> {
  return updateLineItem({ lineId, quantity: 0 })
}

export type PromoState = { status: "idle" | "success" | "error"; message?: string }

/**
 * Adds a discount code to the ones already on the cart.
 *
 * Medusa matches codes exactly, but shoppers type them in any case. The code
 * is tried as typed and then in capitals, which is how codes are usually
 * issued.
 */
export async function applyPromoCode(
  _previous: PromoState,
  formData: FormData
): Promise<PromoState> {
  const t = await actionT()
  const typed = String(formData.get("code") ?? "").trim()
  const cart = await retrieveCart("id,*promotions,completed_at")
  if (!cart || !typed || typed.length > 64) {
    return { status: "error", message: t.cart.promoInvalid }
  }
  const existing = (cart.promotions ?? [])
    .map((promotion) => promotion.code)
    .filter((code): code is string => !!code)

  for (const code of Array.from(new Set([typed, typed.toUpperCase()]))) {
    try {
      const { cart: updated } = await sdk.store.cart.update(
        cart.id,
        { promo_codes: Array.from(new Set([...existing, code])) },
        { fields: "id,*promotions" },
        await authHeaders()
      )
      if ((updated.promotions ?? []).some((promotion) => promotion.code === code)) {
        revalidatePath("/[locale]/cart", "page")
        revalidatePath("/[locale]/checkout", "page")
        return { status: "success", message: t.cart.promoApplied(code) }
      }
    } catch {
      // Medusa rejects a code it does not know. Try the next spelling.
    }
  }
  return { status: "error", message: t.cart.promoInvalid }
}

export async function removePromoCode(code: string): Promise<void> {
  const cart = await retrieveCart("id,*promotions,completed_at")
  if (!cart) {
    return
  }
  const remaining = (cart.promotions ?? [])
    .map((promotion) => promotion.code)
    .filter((existing): existing is string => !!existing && existing !== code)
  await sdk.store.cart.update(
    cart.id,
    { promo_codes: remaining },
    {},
    await authHeaders()
  )
  revalidatePath("/[locale]/cart", "page")
  revalidatePath("/[locale]/checkout", "page")
}

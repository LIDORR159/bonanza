import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { privateFetch } from "./client"
import { authHeaders, getCartId } from "./cookies"

export type StoreCart = HttpTypes.StoreCart

/** Everything the cart and checkout pages show. Totals come from Medusa. */
export const CART_FIELDS = [
  "*items",
  "*items.variant",
  "*items.variant.options",
  "*items.product",
  "+items.total",
  "+items.subtotal",
  "+items.original_total",
  "+items.discount_total",
  "*promotions",
  "*shipping_methods",
  "*shipping_address",
  "*billing_address",
  "*region",
  "*payment_collection",
  "*payment_collection.payment_sessions",
].join(",")

/** The visitor's cart, or null when they have none. Never cached. */
export async function retrieveCart(
  fields: string = CART_FIELDS
): Promise<StoreCart | null> {
  const id = await getCartId()
  if (!id) {
    return null
  }
  try {
    const { cart } = await privateFetch<{ cart: StoreCart }>(`/store/carts/${id}`, {
      query: { fields },
      headers: await authHeaders(),
    })
    // A completed cart has become an order and is no longer a cart.
    return cart.completed_at ? null : cart
  } catch {
    return null
  }
}

export const cartItemCount = (cart: Pick<StoreCart, "items"> | null): number =>
  (cart?.items ?? []).reduce((sum, item) => sum + Number(item.quantity), 0)

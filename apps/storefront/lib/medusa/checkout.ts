"use server"

import type { HttpTypes } from "@medusajs/types"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isEmail } from "../format"
import { actionHref, actionT } from "../i18n/action"
import { CART_FIELDS, retrieveCart } from "./cart-data"
import { privateFetch, sdk } from "./client"
import { authHeaders, clearCartId, getCartId } from "./cookies"
import { parseAddress, type FormState } from "./customer"

/**
 * Checkout: contact and address, shipping method, then payment.
 *
 * The storefront never states a price. Each step sends choices to Medusa and
 * reads the recalculated cart back; the amount charged is the one Medusa holds
 * when the payment session is created.
 */

const refresh = () => {
  revalidatePath("/[locale]/checkout", "page")
  revalidatePath("/[locale]/cart", "page")
}

/** Step 1: email and addresses. */
export async function saveDetails(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const cartId = await getCartId()
  if (!cartId) {
    return { status: "error", message: t.checkout.emptyCart }
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const shipping = await parseAddress(formData, "shipping_")
  const sameBilling = formData.get("billing_same") === "on"
  const billing = sameBilling ? shipping : await parseAddress(formData, "billing_")

  const fieldErrors = {
    ...(isEmail(email) ? {} : { email: t.checkout.errors.email }),
    ...shipping.fieldErrors,
    ...(sameBilling ? {} : billing.fieldErrors),
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", fieldErrors }
  }

  try {
    await sdk.store.cart.update(
      cartId,
      { email, shipping_address: shipping.address, billing_address: billing.address },
      {},
      await authHeaders()
    )
  } catch {
    return { status: "error", message: t.common.genericError }
  }
  refresh()
  redirect(await actionHref("/checkout?step=shipping"))
}

export type ShippingOption = {
  id: string
  name: string
  description: string | null
  /** VAT included. Zero means free. */
  amount: number
}

/** The shipping methods available for the cart's address, with their prices. */
export async function listShippingOptions(cartId: string): Promise<ShippingOption[]> {
  try {
    const { shipping_options } = await privateFetch<{
      shipping_options: (HttpTypes.StoreCartShippingOption & {
        type?: { description?: string | null }
      })[]
    }>("/store/shipping-options", {
      query: { cart_id: cartId },
      headers: await authHeaders(),
    })
    return shipping_options
      .map((option) => ({
        id: option.id,
        name: option.name,
        description: option.type?.description ?? null,
        amount: Number(option.amount ?? 0),
      }))
      .sort((a, b) => a.amount - b.amount)
  } catch {
    return []
  }
}

/** Step 2: the shipping method. */
export async function saveShippingMethod(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const cartId = await getCartId()
  const optionId = String(formData.get("shipping_option") ?? "")
  if (!cartId || !optionId) {
    return { status: "error", message: t.checkout.errors.shipping }
  }
  try {
    await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: optionId },
      {},
      await authHeaders()
    )
  } catch {
    return { status: "error", message: t.checkout.errors.shipping }
  }
  refresh()
  redirect(await actionHref("/checkout?step=payment"))
}

/** The payment providers enabled for the cart's region. */
export async function listPaymentProviders(regionId: string): Promise<string[]> {
  try {
    const { payment_providers } = await privateFetch<{
      payment_providers: { id: string }[]
    }>("/store/payment-providers", {
      query: { region_id: regionId },
      headers: await authHeaders(),
    })
    return payment_providers.map((provider) => provider.id)
  } catch {
    return []
  }
}

/**
 * Step 3: start the payment.
 *
 * Medusa creates a payment session for the cart's current total and the
 * provider answers with the address of its hosted payment page, where the
 * shopper is sent. Card details never reach this site.
 */
export async function startPayment(
  _previous: FormState,
  _formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const cart = await retrieveCart(CART_FIELDS)
  if (!cart || !cart.items?.length) {
    return { status: "error", message: t.checkout.emptyCart }
  }
  if (
    !cart.email ||
    !cart.shipping_address?.address_1 ||
    !cart.shipping_methods?.length
  ) {
    redirect(await actionHref("/checkout"))
  }

  const [providerId] = await listPaymentProviders(cart.region_id ?? "")
  if (!providerId) {
    return { status: "error", message: t.checkout.paymentUnavailable }
  }

  let paymentUrl: string | undefined
  try {
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
      cart,
      { provider_id: providerId },
      {},
      await authHeaders()
    )
    const session = payment_collection.payment_sessions?.find(
      (candidate) =>
        candidate.provider_id === providerId && candidate.status === "pending"
    )
    const url = session?.data?.payment_url
    paymentUrl = typeof url === "string" ? url : undefined
  } catch {
    return { status: "error", message: t.checkout.errors.payment }
  }

  if (!paymentUrl) {
    // A provider with no hosted page settles on the spot.
    redirect(await actionHref("/checkout/return"))
  }
  if (!/^https?:\/\//.test(paymentUrl)) {
    return { status: "error", message: t.checkout.errors.payment }
  }
  redirect(paymentUrl)
}

export type PaymentCheck =
  { status: "paid"; orderId: string } | { status: "pending" } | { status: "no_cart" }

/**
 * Called by the return page after the shopper comes back from the payment
 * page. It asks Medusa to complete the cart, and Medusa asks the payment
 * provider whether the money was really authorized. Nothing the browser says
 * or carries in the address can turn an unpaid cart into an order.
 */
export async function checkPayment(): Promise<PaymentCheck> {
  const cartId = await getCartId()
  if (!cartId) {
    return { status: "no_cart" }
  }
  try {
    const result = await sdk.store.cart.complete(cartId, {}, await authHeaders())
    if (result.type === "order") {
      await clearCartId()
      revalidatePath("/[locale]/cart", "page")
      return { status: "paid", orderId: result.order.id }
    }
    return { status: "pending" }
  } catch {
    return { status: "pending" }
  }
}

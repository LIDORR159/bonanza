"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isEmail, isIsraeliPostalCode, normalizeIsraeliPhone } from "../format"
import type { Dictionary } from "../i18n"
import { actionHref, actionT } from "../i18n/action"
import { privateFetch, sdk } from "./client"
import {
  authHeaders,
  clearAuthToken,
  clearCartId,
  getCartId,
  setAuthToken,
} from "./cookies"
import { visitorHeaders } from "./visitor"

/**
 * Customer accounts, built on Medusa's own email-and-password authentication.
 * The token Medusa issues is kept in an httpOnly cookie and nowhere else.
 */

export type FormState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Record<string, string>
}

const MIN_PASSWORD = 8
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim()

/** Only ever send a visitor to a path on this site after signing in. */
const safeNext = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/account"

const authError = (error: unknown, t: Dictionary): string => {
  const status = (error as { status?: number }).status
  if (status === 429) {
    return t.account.errors.tooManyAttempts
  }
  if (status === 401) {
    return t.account.errors.invalidCredentials
  }
  return t.common.genericError
}

/**
 * A call to the customer sign-in routes. These go to the routes directly, not
 * through the SDK's `auth` helpers, because each must name the visitor it is
 * made for (see visitor.ts) and the helpers cannot carry extra headers.
 */
async function emailpass<T = unknown>(
  path: "" | "/register" | "/reset-password" | "/update",
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  return privateFetch<T>(`/auth/customer/emailpass${path}`, {
    method: "POST",
    body,
    headers: { ...(await visitorHeaders()), ...extraHeaders },
  })
}

/** A guest cart becomes the customer's cart when they sign in. */
async function claimCart() {
  const cartId = await getCartId()
  if (cartId) {
    await sdk.store.cart
      .transferCart(cartId, {}, await authHeaders())
      .catch(() => undefined)
  }
}

export async function login(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const email = text(formData, "email").toLowerCase()
  const password = String(formData.get("password") ?? "")
  if (!isEmail(email) || !password) {
    return { status: "error", message: t.account.errors.invalidCredentials }
  }
  try {
    const { token } = await emailpass<{ token?: string }>("", { email, password })
    if (!token) {
      return { status: "error", message: t.common.genericError }
    }
    await setAuthToken(token)
    await claimCart()
  } catch (error) {
    return { status: "error", message: authError(error, t) }
  }
  redirect(await actionHref(safeNext(text(formData, "next"))))
}

export async function register(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const email = text(formData, "email").toLowerCase()
  const password = String(formData.get("password") ?? "")
  const firstName = text(formData, "first_name")
  const lastName = text(formData, "last_name")
  const phoneInput = text(formData, "phone")
  const phone = phoneInput ? normalizeIsraeliPhone(phoneInput) : null

  const fieldErrors: Record<string, string> = {}
  if (!firstName) fieldErrors.first_name = t.checkout.errors.required
  if (!lastName) fieldErrors.last_name = t.checkout.errors.required
  if (!isEmail(email)) fieldErrors.email = t.checkout.errors.email
  if (phoneInput && !phone) fieldErrors.phone = t.checkout.errors.phone
  if (password.length < MIN_PASSWORD)
    fieldErrors.password = t.account.errors.passwordShort
  if (Object.keys(fieldErrors).length) {
    return { status: "error", fieldErrors }
  }

  try {
    // 1. Create the login. 2. Create the customer it belongs to. 3. Sign in
    // again, because only a token issued after step 2 carries the customer.
    const { token: registrationToken } = await emailpass<{ token: string }>("/register", {
      email,
      password,
    })
    await sdk.store.customer.create(
      { email, first_name: firstName, last_name: lastName, phone: phone ?? undefined },
      {},
      { ...(await visitorHeaders()), authorization: `Bearer ${registrationToken}` }
    )
    const { token } = await emailpass<{ token?: string }>("", { email, password })
    if (!token) {
      return { status: "error", message: t.common.genericError }
    }
    await setAuthToken(token)
    await claimCart()
  } catch (error) {
    const status = (error as { status?: number }).status
    const message = String((error as { message?: string }).message ?? "")
    if (status === 429) {
      return { status: "error", message: t.account.errors.tooManyAttempts }
    }
    if (status === 401 || /exists/i.test(message)) {
      return { status: "error", fieldErrors: { email: t.account.errors.emailTaken } }
    }
    return { status: "error", message: t.common.genericError }
  }
  redirect(await actionHref(safeNext(text(formData, "next"))))
}

export async function logout(): Promise<void> {
  await clearAuthToken()
  // The cart belonged to the customer; a new visitor on this browser starts empty.
  await clearCartId()
  revalidatePath("/", "layout")
  redirect(await actionHref("/account/login"))
}

/**
 * Sends a reset link. The answer is the same whether or not the address has an
 * account, so the form cannot be used to find out who is registered.
 */
export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const email = text(formData, "email").toLowerCase()
  if (!isEmail(email)) {
    return { status: "error", fieldErrors: { email: t.checkout.errors.email } }
  }
  try {
    // Answers 201 with no body.
    await emailpass("/reset-password", { identifier: email }, { accept: "text/plain" })
  } catch (error) {
    if ((error as { status?: number }).status === 429) {
      return { status: "error", message: t.account.errors.tooManyAttempts }
    }
    // Anything else is swallowed on purpose: see the note above.
  }
  return { status: "success", message: t.account.resetSent }
}

export async function resetPassword(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const token = text(formData, "token")
  const email = text(formData, "email").toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm_password") ?? "")

  if (password.length < MIN_PASSWORD) {
    return { status: "error", fieldErrors: { password: t.account.errors.passwordShort } }
  }
  if (password !== confirm) {
    return {
      status: "error",
      fieldErrors: { confirm_password: t.account.errors.passwordMismatch },
    }
  }
  if (!token || !isEmail(email)) {
    return { status: "error", message: t.account.resetInvalid }
  }
  try {
    await emailpass("/update", { email, password }, { authorization: `Bearer ${token}` })
  } catch (error) {
    return {
      status: "error",
      message:
        (error as { status?: number }).status === 429
          ? t.account.errors.tooManyAttempts
          : t.account.resetInvalid,
    }
  }
  return { status: "success", message: t.account.resetDone }
}

export async function updateProfile(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const firstName = text(formData, "first_name")
  const lastName = text(formData, "last_name")
  const phoneInput = text(formData, "phone")
  const phone = phoneInput ? normalizeIsraeliPhone(phoneInput) : null

  const fieldErrors: Record<string, string> = {}
  if (!firstName) fieldErrors.first_name = t.checkout.errors.required
  if (!lastName) fieldErrors.last_name = t.checkout.errors.required
  if (phoneInput && !phone) fieldErrors.phone = t.checkout.errors.phone
  if (Object.keys(fieldErrors).length) {
    return { status: "error", fieldErrors }
  }
  try {
    await sdk.store.customer.update(
      { first_name: firstName, last_name: lastName, phone: phone ?? undefined },
      {},
      await authHeaders()
    )
  } catch {
    return { status: "error", message: t.common.genericError }
  }
  revalidatePath("/[locale]/account", "layout")
  return { status: "success", message: t.account.profileSaved }
}

/** Reads and checks the address fields shared by the address book and checkout. */
export async function parseAddress(formData: FormData, prefix = "") {
  const t = await actionT()
  const field = (name: string) => text(formData, `${prefix}${name}`)
  const phoneInput = field("phone")
  const phone = phoneInput ? normalizeIsraeliPhone(phoneInput) : null
  const postalCode = field("postal_code")

  const fieldErrors: Record<string, string> = {}
  for (const name of ["first_name", "last_name", "address_1", "city"]) {
    if (!field(name)) fieldErrors[`${prefix}${name}`] = t.checkout.errors.required
  }
  if (!phone) fieldErrors[`${prefix}phone`] = t.checkout.errors.phone
  if (postalCode && !isIsraeliPostalCode(postalCode)) {
    fieldErrors[`${prefix}postal_code`] = t.checkout.errors.postalCode
  }

  return {
    fieldErrors,
    address: {
      first_name: field("first_name"),
      last_name: field("last_name"),
      company: field("company") || undefined,
      address_1: field("address_1"),
      address_2: field("address_2") || undefined,
      city: field("city"),
      postal_code: postalCode || undefined,
      country_code: "il",
      phone: phone ?? "",
    },
  }
}

export async function saveAddress(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await actionT()
  const { address, fieldErrors } = await parseAddress(formData)
  if (Object.keys(fieldErrors).length) {
    return { status: "error", fieldErrors }
  }
  const id = text(formData, "address_id")
  const body = {
    ...address,
    is_default_shipping: formData.get("is_default_shipping") === "on",
  }
  try {
    if (id) {
      await sdk.store.customer.updateAddress(id, body, {}, await authHeaders())
    } else {
      await sdk.store.customer.createAddress(body, {}, await authHeaders())
    }
  } catch {
    return { status: "error", message: t.common.genericError }
  }
  revalidatePath("/[locale]/account", "layout")
  return { status: "success", message: t.account.addressSaved }
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const id = text(formData, "address_id")
  if (id) {
    await sdk.store.customer.deleteAddress(id, await authHeaders()).catch(() => undefined)
    revalidatePath("/[locale]/account", "layout")
  }
}

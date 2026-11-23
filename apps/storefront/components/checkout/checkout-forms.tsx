"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FormMessage } from "@/components/ui/field"
import { LockIcon } from "@/components/ui/icons"
import { formatPrice } from "@/lib/format"
import { t } from "@/lib/i18n"
import {
  saveDetails,
  saveShippingMethod,
  startPayment,
  type ShippingOption,
} from "@/lib/medusa/checkout"
import type { FormState } from "@/lib/medusa/customer"
import { AddressFields, type AddressValues } from "./address-fields"

const idle: FormState = { status: "idle" }

/** Step 1: who the order is for and where it goes. */
export function DetailsForm({
  email,
  shipping,
  billing,
  billingDiffers,
  signedIn,
}: {
  email: string
  shipping: AddressValues
  billing: AddressValues
  billingDiffers: boolean
  signedIn: boolean
}) {
  const [state, action, pending] = useActionState(saveDetails, idle)
  const [sameBilling, setSameBilling] = useState(!billingDiffers)
  const errors = state.fieldErrors ?? {}

  return (
    <form action={action} noValidate className="space-y-9">
      <section aria-labelledby="checkout-contact">
        <h2 id="checkout-contact" className="mb-4 text-xl">
          {t.checkout.contact}
        </h2>
        <Field
          label={t.checkout.email}
          name="email"
          type="email"
          ltr
          required
          autoComplete="email"
          hint={t.checkout.emailHint}
          defaultValue={email}
          error={errors.email}
        />
        {!signedIn && (
          <p className="mt-3 text-sm text-mist-300">
            {t.checkout.guestNote} {t.checkout.haveAccount}{" "}
            <Link href="/account/login?next=/checkout" className="font-semibold text-paper underline underline-offset-4">
              {t.checkout.signIn}
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="checkout-shipping-address">
        <h2 id="checkout-shipping-address" className="mb-4 text-xl">
          {t.checkout.shippingAddress}
        </h2>
        <AddressFields
          prefix="shipping_"
          values={shipping}
          errors={errors}
          autoCompleteSection="shipping"
        />
      </section>

      <section aria-labelledby="checkout-billing-address">
        <h2 id="checkout-billing-address" className="mb-4 text-xl">
          {t.checkout.billingAddress}
        </h2>
        <label className="flex cursor-pointer items-center gap-3 text-[0.95rem] text-mist-200">
          <input
            type="checkbox"
            name="billing_same"
            checked={sameBilling}
            onChange={(event) => setSameBilling(event.target.checked)}
            className="size-4 accent-[var(--color-paper)]"
          />
          {t.checkout.billingSame}
        </label>
        {!sameBilling && (
          <div className="mt-5">
            <AddressFields
              prefix="billing_"
              values={billing}
              errors={errors}
              autoCompleteSection="billing"
            />
          </div>
        )}
      </section>

      {state.status === "error" && state.message && (
        <FormMessage tone="error">{state.message}</FormMessage>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {t.checkout.continueToShipping}
      </Button>
    </form>
  )
}

/** Step 2: how the order is delivered. */
export function ShippingForm({
  options,
  selectedId,
}: {
  options: ShippingOption[]
  selectedId: string | null
}) {
  const [state, action, pending] = useActionState(saveShippingMethod, idle)

  if (!options.length) {
    return <FormMessage tone="info">{t.checkout.noShippingOptions}</FormMessage>
  }

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-4 text-xl font-extrabold">{t.checkout.shippingMethod}</legend>
        <div className="space-y-3">
          {options.map((option, index) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-ink-500 bg-ink-900 p-4 transition hover:border-mist-300 has-[:checked]:border-paper has-[:checked]:bg-ink-800 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-paper"
            >
              <input
                type="radio"
                name="shipping_option"
                value={option.id}
                required
                defaultChecked={selectedId ? selectedId === option.id : index === 0}
                className="size-4 shrink-0 accent-[var(--color-paper)]"
              />
              <span className="flex-1">
                <span className="block font-semibold">{option.name}</span>
                {option.description && (
                  <span className="block text-sm text-mist-300">{option.description}</span>
                )}
              </span>
              <span className="font-bold">
                {option.amount === 0 ? (
                  t.cart.free
                ) : (
                  <bdi dir="ltr">{formatPrice(option.amount)}</bdi>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {t.checkout.continueToPayment}
      </Button>
    </form>
  )
}

/** Step 3: hand over to the payment page. */
export function PaymentForm({ available, isTest }: { available: boolean; isTest: boolean }) {
  const [state, action, pending] = useActionState(startPayment, idle)

  if (!available) {
    return <FormMessage tone="info">{t.checkout.paymentUnavailable}</FormMessage>
  }

  return (
    <form action={action} className="space-y-5">
      <h2 className="text-xl">{t.checkout.paymentTitle}</h2>
      <p className="text-mist-300">{t.checkout.paymentRedirect}</p>
      {isTest && <FormMessage tone="info">{t.checkout.devPaymentNote}</FormMessage>}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        <LockIcon className="size-5" />
        {pending ? t.checkout.processing : t.checkout.placeOrder}
      </Button>
      <p className="text-sm text-mist-400">
        {t.checkout.termsNote}{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-paper">
          {t.checkout.termsLink}
        </Link>
        .
      </p>
    </form>
  )
}

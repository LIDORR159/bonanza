"use client"

import { useEffect, useRef } from "react"
import { AddressFields, type AddressValues } from "@/components/checkout/address-fields"
import { Button } from "@/components/ui/button"
import { Field, FormMessage } from "@/components/ui/field"
import { formatIsraeliPhone } from "@/lib/format"
import { useT } from "@/components/i18n/locale-provider"
import { saveAddress, updateProfile, type FormState } from "@/lib/medusa/customer"
import { useFormAction } from "@/components/ui/use-form-action"

const idle: FormState = { status: "idle" }

export function ProfileForm({
  firstName,
  lastName,
  phone,
  email,
}: {
  firstName: string
  lastName: string
  phone: string
  email: string
}) {
  const t = useT()
  const { state, action, onSubmit, pending } = useFormAction(updateProfile, idle)
  const errors = state.fieldErrors ?? {}
  return (
    <form action={action} onSubmit={onSubmit} className="max-w-xl space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.checkout.firstName}
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={firstName}
          error={errors.first_name}
        />
        <Field
          label={t.checkout.lastName}
          name="last_name"
          required
          autoComplete="family-name"
          defaultValue={lastName}
          error={errors.last_name}
        />
      </div>
      <Field
        label={t.account.email}
        name="email_display"
        ltr
        required
        defaultValue={email}
        disabled
      />
      <Field
        label={t.checkout.phone}
        name="phone"
        type="tel"
        ltr
        autoComplete="tel"
        hint={t.checkout.phoneHint}
        defaultValue={formatIsraeliPhone(phone)}
        error={errors.phone}
      />
      {state.message && (
        <FormMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending}>
        {t.common.save}
      </Button>
    </form>
  )
}

/** Adds an address, or edits one when `addressId` is given. */
export function AddressForm({
  addressId,
  values,
  isDefault,
}: {
  addressId?: string
  values?: AddressValues
  isDefault?: boolean
}) {
  const t = useT()
  const { state, action, onSubmit, pending } = useFormAction(saveAddress, idle)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success" && !addressId) {
      formRef.current?.reset()
    }
  }, [state, addressId])

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
    >
      {addressId && <input type="hidden" name="address_id" value={addressId} />}
      <AddressFields values={values} errors={state.fieldErrors ?? {}} />
      <label className="flex cursor-pointer items-center gap-3 text-[0.95rem] text-mist-200">
        <input
          type="checkbox"
          name="is_default_shipping"
          defaultChecked={isDefault}
          className="size-4 accent-[var(--color-paper)]"
        />
        {t.account.makeDefault}
      </label>
      {state.message && (
        <FormMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending}>
        {t.common.save}
      </Button>
    </form>
  )
}

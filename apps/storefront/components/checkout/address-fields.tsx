import { Field } from "@/components/ui/field"
import { formatIsraeliPhone } from "@/lib/format"
import { t } from "@/lib/i18n"

export type AddressValues = Partial<{
  first_name: string | null
  last_name: string | null
  company: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
}>

/**
 * The fields of an Israeli postal address. `prefix` namespaces the input names
 * so a shipping and a billing address can sit in one form.
 */
export function AddressFields({
  prefix = "",
  values = {},
  errors = {},
  autoCompleteSection,
}: {
  prefix?: string
  values?: AddressValues
  errors?: Record<string, string>
  /** `shipping` or `billing`, so browsers autofill the right address. */
  autoCompleteSection?: "shipping" | "billing"
}) {
  const name = (field: string) => `${prefix}${field}`
  const auto = (token: string) =>
    autoCompleteSection ? `${autoCompleteSection} ${token}` : token

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={t.checkout.firstName}
        name={name("first_name")}
        required
        autoComplete={auto("given-name")}
        defaultValue={values.first_name ?? ""}
        error={errors[name("first_name")]}
      />
      <Field
        label={t.checkout.lastName}
        name={name("last_name")}
        required
        autoComplete={auto("family-name")}
        defaultValue={values.last_name ?? ""}
        error={errors[name("last_name")]}
      />
      <Field
        label={t.checkout.phone}
        name={name("phone")}
        type="tel"
        inputMode="tel"
        ltr
        required
        autoComplete={auto("tel")}
        hint={t.checkout.phoneHint}
        defaultValue={formatIsraeliPhone(values.phone)}
        error={errors[name("phone")]}
      />
      <Field
        label={t.checkout.company}
        name={name("company")}
        autoComplete={auto("organization")}
        defaultValue={values.company ?? ""}
      />
      <Field
        className="sm:col-span-2"
        label={t.checkout.street}
        name={name("address_1")}
        required
        autoComplete={auto("address-line1")}
        defaultValue={values.address_1 ?? ""}
        error={errors[name("address_1")]}
      />
      <Field
        className="sm:col-span-2"
        label={t.checkout.apartment}
        name={name("address_2")}
        autoComplete={auto("address-line2")}
        defaultValue={values.address_2 ?? ""}
      />
      <Field
        label={t.checkout.city}
        name={name("city")}
        required
        autoComplete={auto("address-level2")}
        defaultValue={values.city ?? ""}
        error={errors[name("city")]}
      />
      <Field
        label={t.checkout.postalCode}
        name={name("postal_code")}
        inputMode="numeric"
        ltr
        maxLength={7}
        autoComplete={auto("postal-code")}
        hint={t.checkout.postalCodeHint}
        defaultValue={values.postal_code ?? ""}
        error={errors[name("postal_code")]}
      />
      <p className="text-sm text-mist-400 sm:col-span-2">
        {t.checkout.country}: {t.checkout.israel}
      </p>
    </div>
  )
}

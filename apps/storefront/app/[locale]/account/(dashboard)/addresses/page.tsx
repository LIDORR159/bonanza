import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AddressForm } from "@/components/account/account-forms"
import { AddressBlock } from "@/components/checkout/checkout-review"
import { t } from "@/lib/i18n"
import { deleteAddress } from "@/lib/medusa/customer"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const metadata: Metadata = {
  title: t.account.addresses,
  robots: { index: false, follow: false },
}

export default async function AddressesPage() {
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect("/account/login")
  }
  const addresses = customer.addresses ?? []
  return (
    <section className="space-y-10">
      <div>
        <h1 className="mb-5 text-2xl">{t.account.addresses}</h1>
        {addresses.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="rounded-lg border border-ink-600 bg-ink-850 p-5">
                {address.is_default_shipping && (
                  <p className="mb-2 inline-block rounded-sm bg-paper px-2 py-0.5 text-xs font-bold text-ink-950">
                    {t.account.defaultShipping}
                  </p>
                )}
                <AddressBlock address={address} />
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-mist-200 underline underline-offset-4 hover:text-paper">
                    {t.account.editAddress}
                  </summary>
                  <div className="mt-4">
                    <AddressForm
                      addressId={address.id}
                      values={address}
                      isDefault={address.is_default_shipping}
                    />
                  </div>
                </details>
                <form action={deleteAddress} className="mt-3">
                  <input type="hidden" name="address_id" value={address.id} />
                  <button type="submit" className="text-sm text-danger underline underline-offset-4">
                    {t.account.deleteAddress}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-mist-300">{t.account.noAddresses}</p>
        )}
      </div>
      <div className="max-w-xl">
        <h2 className="mb-5 text-xl">{t.account.addAddress}</h2>
        <AddressForm />
      </div>
    </section>
  )
}

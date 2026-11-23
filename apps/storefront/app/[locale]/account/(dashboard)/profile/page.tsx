import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/account/account-forms"
import { t } from "@/lib/i18n"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const metadata: Metadata = {
  title: t.account.profile,
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect("/account/login")
  }
  return (
    <section>
      <h1 className="mb-6 text-2xl">{t.account.profile}</h1>
      <ProfileForm
        firstName={customer.first_name ?? ""}
        lastName={customer.last_name ?? ""}
        phone={customer.phone ?? ""}
        email={customer.email}
      />
    </section>
  )
}

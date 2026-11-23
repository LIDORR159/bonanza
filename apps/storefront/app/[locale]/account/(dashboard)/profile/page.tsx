import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/account/account-forms"
import { getT, href, withLocale } from "@/lib/i18n/server"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.profile,
    robots: { index: false, follow: false },
  }
})

export default withLocale(async function ProfilePage() {
  const t = getT()
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(href("/account/login"))
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
})

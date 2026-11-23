import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { AccountNav } from "@/components/account/account-nav"
import { buttonClass } from "@/components/ui/button"
import { getT, href, withLocale } from "@/lib/i18n/server"
import { logout } from "@/lib/medusa/customer"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const dynamic = "force-dynamic"

/** The signed-in area. Guests are sent to the sign-in page. */
export default withLocale(async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  const t = getT()
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(href("/account/login"))
  }
  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-6">
        <div>
          <p className="eyebrow mb-2">{t.account.title}</p>
          <p className="text-3xl font-extrabold">
            {t.account.greeting(customer.first_name || customer.email)}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            {t.account.signOut}
          </button>
        </form>
      </div>
      <div className="grid gap-8 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <nav aria-label={t.account.title}>
          <AccountNav />
        </nav>
        <div>{children}</div>
      </div>
    </div>
  )
})

import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const dynamic = "force-dynamic"

/** Sign-in pages. A customer who is already signed in goes to their account. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await retrieveCustomer()) {
    redirect("/account")
  }
  return <div className="container-site flex justify-center py-14 lg:py-20">{children}</div>
}

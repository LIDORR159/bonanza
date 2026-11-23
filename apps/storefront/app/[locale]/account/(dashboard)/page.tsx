import type { Metadata } from "next"
import Link from "next/link"
import { OrdersList } from "@/components/account/orders-table"
import { t } from "@/lib/i18n"
import { listOrders } from "@/lib/medusa/customer-data"

export const metadata: Metadata = {
  title: t.account.title,
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const { orders, count } = await listOrders(5)
  return (
    <section aria-labelledby="recent-orders">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h1 id="recent-orders" className="text-2xl">
          {t.account.recentOrders}
        </h1>
        {count > orders.length && (
          <Link href="/account/orders" className="text-sm text-mist-300 underline underline-offset-4 hover:text-paper">
            {t.account.allOrders}
          </Link>
        )}
      </div>
      <OrdersList orders={orders} />
    </section>
  )
}

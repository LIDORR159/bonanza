import type { Metadata } from "next"
import { OrdersList } from "@/components/account/orders-table"
import { t } from "@/lib/i18n"
import { listOrders } from "@/lib/medusa/customer-data"

export const metadata: Metadata = {
  title: t.account.orders,
  robots: { index: false, follow: false },
}

export default async function OrdersPage() {
  const { orders } = await listOrders(50)
  return (
    <section>
      <h1 className="mb-4 text-2xl">{t.account.orders}</h1>
      <OrdersList orders={orders} />
    </section>
  )
}

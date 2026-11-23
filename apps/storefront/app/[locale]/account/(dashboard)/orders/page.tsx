import type { Metadata } from "next"
import { OrdersList } from "@/components/account/orders-table"
import { getT, withLocale } from "@/lib/i18n/server"
import { listOrders } from "@/lib/medusa/customer-data"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.account.orders,
    robots: { index: false, follow: false },
  }
})

export default withLocale(async function OrdersPage() {
  const t = getT()
  const { orders } = await listOrders(50)
  return (
    <section>
      <h1 className="mb-4 text-2xl">{t.account.orders}</h1>
      <OrdersList orders={orders} />
    </section>
  )
})

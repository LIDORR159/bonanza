import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OrderDetails } from "@/components/checkout/order-details"
import { t } from "@/lib/i18n"
import { retrieveCustomerOrder } from "@/lib/medusa/customer-data"

export const metadata: Metadata = {
  title: t.account.orders,
  robots: { index: false, follow: false },
}

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Only the signed-in customer's own orders can be found here.
  const order = await retrieveCustomerOrder(id)
  if (!order) {
    notFound()
  }
  return (
    <section>
      <Link href="/account/orders" className="text-sm text-mist-300 underline underline-offset-4 hover:text-paper">
        {t.common.back}
      </Link>
      <h1 className="mb-6 mt-3 text-2xl">
        {t.order.number} <bdi dir="ltr">#{order.display_id}</bdi>
      </h1>
      <OrderDetails order={order} />
    </section>
  )
}

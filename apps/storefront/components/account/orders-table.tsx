import { Link } from "@/components/ui/link"
import { formatDate, formatPrice } from "@/lib/format"
import { getT, intlCode } from "@/lib/i18n/server"
import type { StoreOrder } from "@/lib/medusa/customer-data"

export function OrdersList({ orders }: { orders: StoreOrder[] }) {
  const t = getT()
  if (!orders.length) {
    return <p className="text-mist-300">{t.account.noOrders}</p>
  }
  return (
    <ul className="divide-y divide-ink-700 border-y border-ink-700">
      {orders.map((order) => (
        <li
          key={order.id}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4"
        >
          <div>
            <p className="font-semibold">
              {t.order.number} <bdi dir="ltr">#{order.display_id}</bdi>
            </p>
            <p className="text-sm text-mist-400">
              {formatDate(order.created_at, intlCode())} ·{" "}
              {t.order.statuses.fulfillment[order.fulfillment_status] ??
                order.fulfillment_status}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <bdi dir="ltr" className="font-bold">
              {formatPrice(Number(order.total))}
            </bdi>
            <Link
              href={`/account/orders/${order.id}`}
              className="text-sm text-mist-200 underline underline-offset-4 hover:text-paper"
            >
              {t.account.viewOrder}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

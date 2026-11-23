import Image from "next/image"
import { AddressBlock } from "@/components/checkout/checkout-review"
import { OrderSummary } from "@/components/cart/order-summary"
import { summaryTotals, toCartLine } from "@/lib/cart-view"
import { formatDate, formatPrice } from "@/lib/format"
import { t } from "@/lib/i18n"
import type { StoreOrder } from "@/lib/medusa/customer-data"

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-sm text-mist-400">{label}</dt>
    <dd className="mt-0.5 font-semibold">{children}</dd>
  </div>
)

/** An order laid out for reading: facts, items, address and totals. */
export function OrderDetails({ order }: { order: StoreOrder }) {
  const lines = (order.items ?? []).map(toCartLine)
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        <dl className="grid grid-cols-2 gap-5 rounded-lg border border-ink-600 bg-ink-850 p-5 sm:grid-cols-4">
          <Fact label={t.order.number}>
            <bdi dir="ltr">#{order.display_id}</bdi>
          </Fact>
          <Fact label={t.order.date}>{formatDate(order.created_at)}</Fact>
          <Fact label={t.order.paymentStatus}>
            {t.order.statuses.payment[order.payment_status] ?? order.payment_status}
          </Fact>
          <Fact label={t.order.fulfillmentStatus}>
            {t.order.statuses.fulfillment[order.fulfillment_status] ?? order.fulfillment_status}
          </Fact>
        </dl>

        <section aria-labelledby="order-items">
          <h2 id="order-items" className="mb-3 text-xl">
            {t.order.items}
          </h2>
          <ul className="divide-y divide-ink-700 border-y border-ink-700">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-4 py-4">
                <div className="product-well relative size-16 shrink-0 overflow-hidden rounded-md">
                  {line.thumbnail && (
                    <Image src={line.thumbnail} alt="" fill sizes="64px" className="object-contain p-1.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{line.title}</p>
                  <p className="text-sm text-mist-400">
                    {line.variantTitle && (
                      <>
                        <bdi>{line.variantTitle}</bdi> ·{" "}
                      </>
                    )}
                    {t.product.quantity}: {line.quantity}
                  </p>
                </div>
                <bdi dir="ltr" className="font-semibold">
                  {formatPrice(line.lineTotal)}
                </bdi>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 text-base">{t.order.shippingTo}</h2>
            <AddressBlock address={order.shipping_address} />
          </section>
          <section>
            <h2 className="mb-2 text-base">{t.order.shippingMethod}</h2>
            <p className="text-[0.95rem] text-mist-200">{order.shipping_methods?.[0]?.name}</p>
          </section>
        </div>
      </div>

      <div className="lg:self-start">
        <OrderSummary totals={summaryTotals(order)} title={t.order.summary} />
      </div>
    </div>
  )
}

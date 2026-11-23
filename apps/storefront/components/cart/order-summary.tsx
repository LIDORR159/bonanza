import type { ReactNode } from "react"
import { formatPrice } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

export type SummaryTotals = {
  /** Items at their listed prices, VAT included. */
  itemsTotal: number
  discountTotal: number
  /** Null until a shipping method is chosen. */
  shippingTotal: number | null
  taxTotal: number
  total: number
}

const Row = ({
  label,
  children,
  strong,
}: {
  label: string
  children: ReactNode
  strong?: boolean
}) => (
  <div
    className={
      strong
        ? "flex items-baseline justify-between gap-4 border-t border-ink-600 pt-4 text-lg font-bold"
        : "flex items-baseline justify-between gap-4 text-[0.95rem] text-mist-200"
    }
  >
    <dt>{label}</dt>
    <dd className={strong ? "text-2xl" : "font-medium text-paper"}>{children}</dd>
  </div>
)

const Money = ({ amount }: { amount: number }) => (
  <bdi dir="ltr">{formatPrice(amount)}</bdi>
)

/**
 * The order totals. Every figure is one Medusa calculated; nothing is added up
 * here. Prices include VAT, and the VAT portion is shown beneath the total.
 */
export function OrderSummary({
  totals,
  title,
  children,
}: {
  totals: SummaryTotals
  title?: string
  children?: ReactNode
}) {
  const t = getT()
  return (
    <section
      aria-labelledby="order-summary-title"
      className="rounded-lg border border-ink-600 bg-ink-850 p-6"
    >
      <h2 id="order-summary-title" className="mb-5 text-xl">
        {title ?? t.cart.summary}
      </h2>
      <dl className="space-y-3">
        <Row label={t.cart.subtotal}>
          <Money amount={totals.itemsTotal} />
        </Row>
        {totals.discountTotal > 0 && (
          <Row label={t.cart.discount}>
            <span className="text-success">
              <Money amount={-totals.discountTotal} />
            </span>
          </Row>
        )}
        <Row label={t.cart.shipping}>
          {totals.shippingTotal == null ? (
            <span className="font-normal text-mist-400">{t.cart.shippingAtCheckout}</span>
          ) : totals.shippingTotal === 0 ? (
            t.cart.free
          ) : (
            <Money amount={totals.shippingTotal} />
          )}
        </Row>
        <Row label={t.cart.orderTotal} strong>
          <Money amount={totals.total} />
        </Row>
      </dl>
      <p className="mt-2 text-end text-xs text-mist-400">
        {t.cart.vat}: <Money amount={totals.taxTotal} />
      </p>
      {children && <div className="mt-6 space-y-4">{children}</div>}
    </section>
  )
}

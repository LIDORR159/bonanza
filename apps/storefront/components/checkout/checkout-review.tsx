import Image from "next/image"
import Link from "next/link"
import type { CartLine } from "@/components/cart/cart-line-items"
import { OrderSummary, type SummaryTotals } from "@/components/cart/order-summary"
import { formatIsraeliPhone, formatPrice } from "@/lib/format"
import { t } from "@/lib/i18n"

type Address = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  phone?: string | null
} | null

/** A postal address laid out for reading. */
export function AddressBlock({ address }: { address: Address | undefined }) {
  if (!address) {
    return null
  }
  return (
    <address className="text-[0.95rem] not-italic leading-relaxed text-mist-200">
      {[address.first_name, address.last_name].filter(Boolean).join(" ")}
      <br />
      {[address.address_1, address.address_2].filter(Boolean).join(", ")}
      <br />
      {[address.city, address.postal_code].filter(Boolean).join(" ")}
      {address.phone && (
        <>
          <br />
          <bdi dir="ltr">{formatIsraeliPhone(address.phone)}</bdi>
        </>
      )}
    </address>
  )
}

/** The side panel of the checkout: the items, then the totals. */
export function CheckoutSummary({ lines, totals }: { lines: CartLine[]; totals: SummaryTotals }) {
  return (
    <OrderSummary totals={totals} title={t.checkout.review}>
      <ul className="-mt-1 divide-y divide-ink-700 border-t border-ink-700">
        {lines.map((line) => (
          <li key={line.id} className="flex items-center gap-3 py-3">
            <div className="product-well relative size-14 shrink-0 overflow-hidden rounded-md">
              {line.thumbnail && (
                <Image src={line.thumbnail} alt="" fill sizes="56px" className="object-contain p-1" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{line.title}</p>
              <p className="text-mist-400">
                {line.variantTitle && (
                  <>
                    <bdi>{line.variantTitle}</bdi> ·{" "}
                  </>
                )}
                {t.product.quantity}: {line.quantity}
              </p>
            </div>
            <bdi dir="ltr" className="text-sm font-semibold">
              {formatPrice(line.lineTotal)}
            </bdi>
          </li>
        ))}
      </ul>
      <Link href="/cart" className="block text-sm text-mist-300 underline underline-offset-4 hover:text-paper">
        {t.checkout.change}
      </Link>
    </OrderSummary>
  )
}

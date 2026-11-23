import type { Metadata } from "next"
import { CartLineItems } from "@/components/cart/cart-line-items"
import { OrderSummary } from "@/components/cart/order-summary"
import { PromoCodeForm } from "@/components/cart/promo-code-form"
import { ButtonLink } from "@/components/ui/button"
import { LockIcon } from "@/components/ui/icons"
import { summaryTotals, toCartLine } from "@/lib/cart-view"
import { formatPrice } from "@/lib/format"
import { t } from "@/lib/i18n"
import { retrieveCart } from "@/lib/medusa/cart-data"
import { getSettings } from "@/lib/medusa/content"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: t.cart.title,
  robots: { index: false, follow: false },
}

export default async function CartPage() {
  const [cart, settings] = await Promise.all([retrieveCart(), getSettings()])
  const lines = (cart?.items ?? [])
    .slice()
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map(toCartLine)

  if (!cart || !lines.length) {
    return (
      <div className="container-site flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl">{t.cart.title}</h1>
        <p className="mt-4 text-lg text-mist-300">{t.cart.empty}</p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          {t.cart.emptyCta}
        </ButtonLink>
      </div>
    )
  }

  const totals = summaryTotals(cart)
  const threshold = settings.free_shipping_threshold
  const itemsAfterDiscount = Number(cart.item_total ?? 0)
  const remaining = threshold != null ? threshold - itemsAfterDiscount : null

  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <h1 className="mb-8 text-3xl sm:text-4xl">{t.cart.title}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          {remaining != null && (
            <p className="mb-5 rounded-md border border-ink-600 bg-ink-850 px-4 py-3 text-sm text-mist-200">
              {remaining > 0 ? (
                <>
                  {t.cart.freeShippingProgress("")}
                  <bdi dir="ltr" className="font-bold text-paper">
                    {formatPrice(remaining)}
                  </bdi>
                </>
              ) : (
                <span className="font-semibold text-success">{t.cart.freeShippingReached}</span>
              )}
            </p>
          )}
          <CartLineItems lines={lines} />
          <ButtonLink href="/products" variant="ghost" className="mt-4 px-0">
            {t.cart.continueShopping}
          </ButtonLink>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <OrderSummary totals={totals}>
            <PromoCodeForm
              applied={(cart.promotions ?? [])
                .map((promotion) => promotion.code)
                .filter((code): code is string => !!code)}
            />
            <ButtonLink href="/checkout" size="lg" className="w-full">
              <LockIcon className="size-5" />
              {t.cart.checkout}
            </ButtonLink>
          </OrderSummary>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import { Link } from "@/components/ui/link"
import { redirect } from "next/navigation"
import { AddressBlock, CheckoutSummary } from "@/components/checkout/checkout-review"
import {
  DetailsForm,
  PaymentForm,
  ShippingForm,
} from "@/components/checkout/checkout-forms"
import {
  CHECKOUT_STEPS,
  CheckoutSteps,
  type CheckoutStep,
} from "@/components/checkout/checkout-steps"
import { summaryTotals, toCartLine } from "@/lib/cart-view"
import { getT, href, withLocale } from "@/lib/i18n/server"
import { retrieveCart } from "@/lib/medusa/cart-data"
import { listPaymentProviders, listShippingOptions } from "@/lib/medusa/checkout"
import { retrieveCustomer } from "@/lib/medusa/customer-data"

export const dynamic = "force-dynamic"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.checkout.title,
    robots: { index: false, follow: false },
  }
})

type Props = { searchParams: Promise<{ step?: string }> }

export default withLocale(async function CheckoutPage({ searchParams }: Props) {
  const t = getT()
  const [{ step: requested }, cart, customer] = await Promise.all([
    searchParams,
    retrieveCart(),
    retrieveCustomer(),
  ])

  if (!cart || !cart.items?.length) {
    redirect(href("/cart"))
  }

  // A step can only be opened once the ones before it are complete.
  const hasDetails = !!cart.email && !!cart.shipping_address?.address_1
  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0
  const furthest: CheckoutStep = !hasDetails
    ? "details"
    : !hasShipping
      ? "shipping"
      : "payment"
  const wanted = (CHECKOUT_STEPS as readonly string[]).includes(requested ?? "")
    ? (requested as CheckoutStep)
    : furthest
  const step =
    CHECKOUT_STEPS.indexOf(wanted) <= CHECKOUT_STEPS.indexOf(furthest) ? wanted : furthest

  const lines = cart.items.map(toCartLine)
  const totals = summaryTotals(cart)

  // A signed-in customer starts from their saved default address.
  const saved =
    customer?.addresses?.find((address) => address.is_default_shipping) ??
    customer?.addresses?.[0]
  const shipping = cart.shipping_address?.address_1
    ? cart.shipping_address
    : (saved ?? {
        first_name: customer?.first_name,
        last_name: customer?.last_name,
        phone: customer?.phone,
      })
  const billing = cart.billing_address ?? {}
  const billingDiffers =
    !!cart.billing_address?.address_1 &&
    (cart.billing_address.address_1 !== cart.shipping_address?.address_1 ||
      cart.billing_address.city !== cart.shipping_address?.city ||
      cart.billing_address.first_name !== cart.shipping_address?.first_name)

  return (
    <div className="container-site pb-8 pt-8 lg:pt-10">
      <h1 className="mb-7 text-3xl sm:text-4xl">{t.checkout.title}</h1>
      <CheckoutSteps current={step} />

      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          {step === "details" && (
            <DetailsForm
              email={cart.email ?? customer?.email ?? ""}
              shipping={shipping}
              billing={billing}
              billingDiffers={billingDiffers}
              signedIn={!!customer}
            />
          )}

          {step !== "details" && (
            <section className="mb-8 rounded-lg border border-ink-600 bg-ink-850 p-5">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 className="text-base">{t.checkout.shippingAddress}</h2>
                <Link
                  href="/checkout?step=details"
                  className="text-sm text-mist-300 underline underline-offset-4 hover:text-paper"
                >
                  {t.checkout.change}
                </Link>
              </div>
              <p className="mb-1 text-[0.95rem] text-mist-200">
                <bdi dir="ltr">{cart.email}</bdi>
              </p>
              <AddressBlock address={cart.shipping_address} />
            </section>
          )}

          {step === "shipping" && (
            <ShippingForm
              options={await listShippingOptions(cart.id)}
              selectedId={cart.shipping_methods?.[0]?.shipping_option_id ?? null}
            />
          )}

          {step === "payment" && (
            <>
              <section className="mb-8 rounded-lg border border-ink-600 bg-ink-850 p-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h2 className="text-base">{t.checkout.shippingMethod}</h2>
                  <Link
                    href="/checkout?step=shipping"
                    className="text-sm text-mist-300 underline underline-offset-4 hover:text-paper"
                  >
                    {t.checkout.change}
                  </Link>
                </div>
                <p className="text-[0.95rem] text-mist-200">
                  {cart.shipping_methods?.[0]?.name}
                </p>
              </section>
              <PaymentStep regionId={cart.region_id ?? ""} />
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <CheckoutSummary lines={lines} totals={totals} />
        </div>
      </div>
    </div>
  )
})

async function PaymentStep({ regionId }: { regionId: string }) {
  const providers = await listPaymentProviders(regionId)
  return (
    <PaymentForm
      available={providers.length > 0}
      isTest={providers.some((id) => id.includes("dev-hosted"))}
    />
  )
}

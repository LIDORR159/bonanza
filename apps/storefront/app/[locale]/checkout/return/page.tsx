import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PaymentResult } from "@/components/checkout/payment-result"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/config"
import { localePath } from "@/lib/i18n"
import { getLocale, getT, withLocale } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

export const generateMetadata = withLocale((): Metadata => {
  const t = getT()
  return {
    title: t.checkout.title,
    robots: { index: false, follow: false },
  }
})

type Props = { searchParams: Promise<{ outcome?: string }> }

/** Where the payment page sends the shopper back to. */
export default withLocale(async function CheckoutReturnPage({ searchParams }: Props) {
  const { outcome } = await searchParams

  // The payment page knows one return address, without a language. A shopper
  // who was checking out in English or Arabic is sent on to their own.
  const remembered = (await cookies()).get(LOCALE_COOKIE)?.value
  if (
    getLocale() === DEFAULT_LOCALE &&
    isLocale(remembered) &&
    remembered !== DEFAULT_LOCALE
  ) {
    const query = outcome ? `?outcome=${encodeURIComponent(outcome)}` : ""
    redirect(localePath(remembered, `/checkout/return${query}`))
  }

  const hint =
    outcome === "approved" || outcome === "declined" || outcome === "canceled"
      ? outcome
      : "unknown"
  return <PaymentResult outcome={hint} />
})

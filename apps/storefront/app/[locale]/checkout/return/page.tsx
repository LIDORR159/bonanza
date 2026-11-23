import type { Metadata } from "next"
import { PaymentResult } from "@/components/checkout/payment-result"
import { t } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: t.checkout.title,
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ outcome?: string }> }

/** Where the payment page sends the shopper back to. */
export default async function CheckoutReturnPage({ searchParams }: Props) {
  const { outcome } = await searchParams
  const hint =
    outcome === "approved" || outcome === "declined" || outcome === "canceled"
      ? outcome
      : "unknown"
  return <PaymentResult outcome={hint} />
}

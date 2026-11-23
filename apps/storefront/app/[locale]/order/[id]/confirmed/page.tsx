import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OrderDetails } from "@/components/checkout/order-details"
import { ButtonLink } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import { t } from "@/lib/i18n"
import { retrieveOrder } from "@/lib/medusa/customer-data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: t.order.confirmedTitle,
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function OrderConfirmedPage({ params }: Props) {
  const { id } = await params
  const order = await retrieveOrder(id)
  if (!order) {
    notFound()
  }
  return (
    <div className="container-site pb-8 pt-10">
      <div className="mb-10 flex flex-col items-start gap-4 border-b border-ink-700 pb-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-paper text-ink-950">
          <CheckIcon className="size-7" />
        </span>
        <h1 className="text-3xl sm:text-4xl">{t.order.confirmedTitle}</h1>
        {order.email && (
          <p className="text-lg text-mist-300">
            {t.order.confirmedSubtitle("")}
            <bdi dir="ltr">{order.email}</bdi>
          </p>
        )}
      </div>
      <OrderDetails order={order} />
      <ButtonLink href="/products" variant="secondary" size="lg" className="mt-10">
        {t.order.continueShopping}
      </ButtonLink>
    </div>
  )
}

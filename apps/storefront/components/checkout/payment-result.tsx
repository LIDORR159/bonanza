"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useCart } from "@/components/cart/cart-context"
import { Button, ButtonLink } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { checkPayment } from "@/lib/medusa/checkout"

type Outcome = "approved" | "declined" | "canceled" | "unknown"

const ATTEMPTS = 8
const INTERVAL_MS = 2000

/**
 * Shown when the shopper returns from the payment page.
 *
 * `outcome` comes from the address and is only a hint for which message to
 * show; it decides nothing. Whether an order exists is settled by asking the
 * backend, which asks the payment provider. The check is repeated for a short
 * while because the provider's confirmation can arrive a moment after the
 * shopper does.
 */
export function PaymentResult({ outcome }: { outcome: Outcome }) {
  const router = useRouter()
  const { refresh } = useCart()
  const [state, setState] = useState<"checking" | "pending" | Outcome>(
    outcome === "declined" || outcome === "canceled" ? outcome : "checking"
  )
  const started = useRef(false)

  const poll = useCallback(async () => {
    setState("checking")
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const result = await checkPayment()
      if (result.status === "paid") {
        await refresh()
        router.replace(`/order/${result.orderId}/confirmed`)
        return
      }
      if (result.status === "no_cart") {
        router.replace("/cart")
        return
      }
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS))
    }
    setState("pending")
  }, [refresh, router])

  useEffect(() => {
    if (state === "checking" && !started.current) {
      started.current = true
      void poll()
    }
  }, [state, poll])

  const copy = {
    checking: [t.checkout.returnPage.checking, t.checkout.returnPage.checkingHint],
    pending: [t.checkout.returnPage.pending, t.checkout.returnPage.pendingHint],
    declined: [t.checkout.returnPage.declined, t.checkout.returnPage.declinedHint],
    canceled: [t.checkout.returnPage.canceled, t.checkout.returnPage.canceledHint],
    approved: [t.checkout.returnPage.checking, t.checkout.returnPage.checkingHint],
    unknown: [t.checkout.returnPage.checking, t.checkout.returnPage.checkingHint],
  }[state]

  return (
    <div className="container-site flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      {state === "checking" && (
        <span
          aria-hidden="true"
          className="mb-7 size-10 animate-spin rounded-full border-2 border-ink-500 border-t-paper"
        />
      )}
      <h1 className="text-3xl sm:text-4xl" aria-live="polite">
        {copy[0]}
      </h1>
      <p className="mt-4 max-w-md text-lg text-mist-300">{copy[1]}</p>
      {state !== "checking" && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/checkout?step=payment" size="lg">
            {t.checkout.returnPage.tryAgain}
          </ButtonLink>
          {state === "pending" && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                started.current = true
                void poll()
              }}
            >
              {t.checkout.returnPage.checkAgain}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

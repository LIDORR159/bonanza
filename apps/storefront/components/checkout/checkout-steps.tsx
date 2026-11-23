import clsx from "clsx"
import { Link } from "@/components/ui/link"
import { CheckIcon } from "@/components/ui/icons"
import { getT } from "@/lib/i18n/server"

export const CHECKOUT_STEPS = ["details", "shipping", "payment"] as const
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

/** Where the shopper is in the checkout. Finished steps link back to themselves. */
export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const t = getT()
  const currentIndex = CHECKOUT_STEPS.indexOf(current)
  return (
    <ol className="mb-9 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {CHECKOUT_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        const label = t.checkout.steps[step]
        const marker = (
          <span
            aria-hidden="true"
            className={clsx(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
              active && "border-paper bg-paper text-ink-950",
              done && "border-mist-300 text-mist-200",
              !active && !done && "border-ink-500 text-mist-400"
            )}
          >
            {done ? <CheckIcon className="size-4" /> : index + 1}
          </span>
        )
        return (
          <li key={step} className="flex items-center gap-3">
            {index > 0 && (
              <span aria-hidden="true" className="h-px w-6 bg-ink-500 sm:w-10" />
            )}
            {done ? (
              <Link
                href={`/checkout?step=${step}`}
                className="inline-flex items-center gap-2 text-mist-200 hover:text-paper"
              >
                {marker}
                {label}
              </Link>
            ) : (
              <span
                aria-current={active ? "step" : undefined}
                className={clsx(
                  "inline-flex items-center gap-2",
                  active ? "font-bold text-paper" : "text-mist-400"
                )}
              >
                {marker}
                {label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

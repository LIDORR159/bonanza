"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useTransition } from "react"
import { buttonClass } from "@/components/ui/button"
import { inputClass } from "@/components/ui/field"
import { CloseIcon } from "@/components/ui/icons"
import { t } from "@/lib/i18n"
import { applyPromoCode, removePromoCode, type PromoState } from "@/lib/medusa/cart"
import { useFormAction } from "@/components/ui/use-form-action"

const initial: PromoState = { status: "idle" }

/** Discount codes: the ones applied, and a field to add another. */
export function PromoCodeForm({ applied }: { applied: string[] }) {
  const router = useRouter()
  const { state, action, onSubmit, pending } = useFormAction(applyPromoCode, initial)
  const [removing, startRemoving] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state, router])

  return (
    <div>
      {applied.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {applied.map((code) => (
            <li
              key={code}
              className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 ps-3 text-sm font-semibold text-success"
            >
              <bdi dir="ltr">{code}</bdi>
              <button
                type="button"
                disabled={removing}
                aria-label={t.cart.promoRemove(code)}
                onClick={() =>
                  startRemoving(async () => {
                    await removePromoCode(code)
                    router.refresh()
                  })
                }
                className="inline-flex size-9 items-center justify-center rounded-md hover:bg-white/10"
              >
                <CloseIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={action} onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="promo-code" className="sr-only">
          {t.cart.promoLabel}
        </label>
        <input
          id="promo-code"
          name="code"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={64}
          required
          placeholder={t.cart.promoPlaceholder}
          className={`${inputClass} h-11 text-start text-sm placeholder:text-end`}
        />
        <button type="submit" disabled={pending} className={buttonClass("secondary", "md", "shrink-0")}>
          {t.cart.promoApply}
        </button>
      </form>
      <p
        aria-live="polite"
        className={`mt-2 min-h-5 text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}
      >
        {state.message}
      </p>
    </div>
  )
}

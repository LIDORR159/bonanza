"use client"

import { MinusIcon, PlusIcon } from "./icons"
import { useT } from "@/components/i18n/locale-provider"

const stepButton =
  "inline-flex size-11 items-center justify-center text-mist-200 transition hover:bg-white/5 " +
  "hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"

/** A number input with minus and plus buttons. Keeps its value within min and max. */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  disabled,
  id,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  disabled?: boolean
  id?: string
}) {
  const t = useT()
  const clamp = (next: number) => Math.min(Math.max(Math.round(next) || min, min), max)
  return (
    <div
      role="group"
      aria-label={label}
      // Minus, number, plus read left to right in every language.
      dir="ltr"
      className="inline-flex items-center overflow-hidden rounded-md border border-ink-500 bg-ink-900"
    >
      <button
        type="button"
        className={stepButton}
        aria-label={t.product.decrease}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(clamp(Number(event.target.value)))}
        className="h-11 w-12 border-x border-ink-500 bg-transparent text-center text-base font-semibold text-paper focus:outline-none focus-visible:bg-white/5"
      />
      <button
        type="button"
        className={stepButton}
        aria-label={t.product.increase}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  )
}

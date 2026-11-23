"use client"

import clsx from "clsx"
import { formatPrice } from "@/lib/format"
import { useT } from "@/components/i18n/locale-provider"

type Props = {
  amount: number | null | undefined
  /** The regular price, shown crossed out when it is higher than `amount`. */
  original?: number | null
  /** Shown before the price when the product has several prices. */
  from?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { now: "text-sm", was: "text-xs" },
  md: { now: "text-base", was: "text-sm" },
  lg: { now: "text-3xl", was: "text-lg" },
}

/**
 * A price in shekels. Each amount sits in a left-to-right <bdi>, so the sign
 * and the digits keep their order inside right-to-left text.
 */
export function Price({ amount, original, from, size = "md", className }: Props) {
  const t = useT()
  if (amount == null) {
    return null
  }
  const onSale = original != null && original > amount
  return (
    <span className={clsx("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {from && (
        <span className={clsx("text-mist-400", sizes[size].was)}>{t.product.from}</span>
      )}
      <span className={clsx("font-bold text-paper", sizes[size].now)}>
        {onSale && <span className="sr-only">{t.product.salePrice}: </span>}
        <bdi dir="ltr">{formatPrice(amount)}</bdi>
      </span>
      {onSale && (
        <span className={clsx("text-mist-400 line-through", sizes[size].was)}>
          <span className="sr-only">{t.product.regularPrice}: </span>
          <bdi dir="ltr">{formatPrice(original)}</bdi>
        </span>
      )}
    </span>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { TrashIcon } from "@/components/ui/icons"
import { Price } from "@/components/ui/price"
import { QuantityInput } from "@/components/ui/quantity-input"
import { t } from "@/lib/i18n"
import { removeLineItem, updateLineItem } from "@/lib/medusa/cart"
import { useCart } from "./cart-context"

export type CartLine = {
  id: string
  title: string
  variantTitle: string | null
  handle: string | null
  thumbnail: string | null
  quantity: number
  unitPrice: number
  compareAtUnitPrice: number | null
  /** Unit price × quantity, before order-level discounts. */
  lineTotal: number
  maxQuantity: number
}

/** The cart's lines, with quantity and remove controls. */
export function CartLineItems({ lines }: { lines: CartLine[] }) {
  const router = useRouter()
  const { setCount } = useCart()
  const [pending, startTransition] = useTransition()
  const [busyLine, setBusyLine] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const change = (lineId: string, action: () => ReturnType<typeof updateLineItem>) => {
    setBusyLine(lineId)
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        setCount(result.count)
        router.refresh()
      } else {
        setError(result.error)
      }
      setBusyLine(null)
    })
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="divide-y divide-ink-700 border-y border-ink-700">
        {lines.map((line) => {
          const busy = pending && busyLine === line.id
          return (
            <li
              key={line.id}
              className={`grid grid-cols-[5.5rem_1fr] gap-4 py-5 transition-opacity sm:grid-cols-[7rem_1fr_auto] sm:gap-6 ${
                busy ? "opacity-50" : ""
              }`}
            >
              <div className="product-well relative aspect-square overflow-hidden rounded-md">
                {line.thumbnail && (
                  <Image
                    src={line.thumbnail}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-contain p-[10%]"
                  />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-snug">
                  {line.handle ? (
                    <Link href={`/products/${line.handle}`} className="hover:underline">
                      {line.title}
                    </Link>
                  ) : (
                    line.title
                  )}
                </h2>
                {line.variantTitle && (
                  <p className="mt-0.5 text-sm text-mist-400">
                    <bdi>{line.variantTitle}</bdi>
                  </p>
                )}
                <p className="mt-1.5 text-sm text-mist-300">
                  <span className="sr-only">{t.cart.unitPrice}: </span>
                  <Price amount={line.unitPrice} original={line.compareAtUnitPrice} size="sm" />
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <QuantityInput
                    value={line.quantity}
                    max={Math.max(line.maxQuantity, line.quantity)}
                    label={t.cart.quantityOf(line.title)}
                    disabled={pending}
                    onChange={(quantity) => {
                      if (quantity !== line.quantity) {
                        change(line.id, () => updateLineItem({ lineId: line.id, quantity }))
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => change(line.id, () => removeLineItem(line.id))}
                    aria-label={t.cart.removeItem(line.title)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-mist-300 transition hover:bg-white/5 hover:text-paper disabled:opacity-40"
                  >
                    <TrashIcon className="size-5" />
                    <span className="max-sm:sr-only">{t.common.remove}</span>
                  </button>
                </div>
              </div>

              <p className="col-span-2 text-end text-lg font-bold sm:col-span-1 sm:min-w-24">
                <span className="sr-only">{t.cart.total}: </span>
                <bdi dir="ltr">
                  <Price amount={line.lineTotal} />
                </bdi>
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

"use client"

import clsx from "clsx"
import Link from "next/link"
import { useId, useMemo, useState, useTransition } from "react"
import { useCart } from "@/components/cart/cart-context"
import { Button, buttonClass } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import { Price } from "@/components/ui/price"
import { QuantityInput } from "@/components/ui/quantity-input"
import { t } from "@/lib/i18n"
import { addToCart } from "@/lib/medusa/cart"
import type { StockState } from "@/lib/product"

export type PurchaseVariant = {
  id: string
  sku: string | null
  /** option id → chosen value */
  options: Record<string, string>
  price: { amount: number; original: number; onSale: boolean } | null
  stock: StockState
  /** Units left when stock is low. */
  remaining: number | null
  max: number
}

export type PurchaseOption = { id: string; title: string; values: string[] }

/**
 * Variant choice, quantity and the add-to-cart button. Prices and stock were
 * read from Medusa on the server; this component only picks which variant's
 * figures to show.
 */
export function ProductPurchase({
  options,
  variants,
}: {
  options: PurchaseOption[]
  variants: PurchaseVariant[]
}) {
  const { setCount } = useCart()
  const groupId = useId()
  const [pending, startTransition] = useTransition()
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  // Start on the first variant that can be bought.
  const initial = variants.find((variant) => variant.stock !== "out_of_stock") ?? variants[0]
  const [selection, setSelection] = useState<Record<string, string>>(initial?.options ?? {})

  const variant = useMemo(
    () =>
      variants.find((candidate) =>
        options.every((option) => candidate.options[option.id] === selection[option.id])
      ),
    [variants, options, selection]
  )

  /** Whether choosing this value leads to a variant that exists and is in stock. */
  const available = (optionId: string, value: string) =>
    variants.some(
      (candidate) =>
        candidate.stock !== "out_of_stock" &&
        options.every((option) =>
          option.id === optionId
            ? candidate.options[option.id] === value
            : candidate.options[option.id] === selection[option.id]
        )
    )

  const canBuy = !!variant && variant.stock !== "out_of_stock" && !!variant.price
  const max = variant?.max ?? 1

  const submit = () => {
    if (!variant || !canBuy) {
      return
    }
    setFeedback(null)
    startTransition(async () => {
      const result = await addToCart({ variantId: variant.id, quantity: Math.min(quantity, max) })
      if (result.ok) {
        setCount(result.count)
        setFeedback({ tone: "success", text: t.product.added })
      } else {
        setFeedback({ tone: "error", text: result.error })
      }
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Price amount={variant?.price?.amount} original={variant?.price?.original} size="lg" />
        {variant?.price?.onSale && (
          <span className="rounded-sm bg-paper px-2 py-1 text-xs font-bold leading-none text-ink-950">
            {t.product.sale}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-mist-400">{t.product.vatIncluded}</p>

      {options.map((option) => (
        <fieldset key={option.id} className="mt-7">
          <legend className="mb-2.5 text-sm font-semibold text-paper">
            {option.title}
            {selection[option.id] && (
              <span className="ms-2 font-normal text-mist-300">
                <bdi>{selection[option.id]}</bdi>
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const checked = selection[option.id] === value
              const inStock = available(option.id, value)
              return (
                <label
                  key={value}
                  className={clsx(
                    "relative inline-flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium transition",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-paper",
                    checked
                      ? "border-paper bg-paper text-ink-950"
                      : "border-ink-500 text-mist-200 hover:border-mist-300",
                    !inStock && !checked && "text-mist-400 line-through decoration-mist-400/60"
                  )}
                >
                  <input
                    type="radio"
                    name={`${groupId}-${option.id}`}
                    value={value}
                    checked={checked}
                    onChange={() => {
                      setSelection((current) => ({ ...current, [option.id]: value }))
                      setQuantity(1)
                      setFeedback(null)
                    }}
                    className="sr-only"
                  />
                  <bdi>{value}</bdi>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      <p
        className={clsx(
          "mt-6 inline-flex items-center gap-2 text-sm font-medium",
          !variant || variant.stock === "out_of_stock"
            ? "text-danger"
            : variant.stock === "low_stock"
              ? "text-warning"
              : "text-success"
        )}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-current" />
        {!variant
          ? t.product.unavailable
          : variant.stock === "out_of_stock"
            ? t.product.outOfStock
            : variant.stock === "low_stock" && variant.remaining
              ? t.product.lowStock(variant.remaining)
              : t.product.inStock}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <QuantityInput
          value={Math.min(quantity, Math.max(max, 1))}
          onChange={setQuantity}
          max={Math.max(max, 1)}
          label={t.product.quantity}
          disabled={!canBuy || pending}
        />
        <Button
          size="lg"
          className="min-w-52 flex-1"
          disabled={!canBuy || pending}
          onClick={submit}
        >
          {pending ? t.product.adding : canBuy ? t.product.addToCart : t.product.outOfStock}
        </Button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-12">
        {feedback?.tone === "success" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success animate-fade">
            <span className="inline-flex items-center gap-2 font-medium">
              <CheckIcon className="size-5" />
              {feedback.text}
            </span>
            <Link href="/cart" className={buttonClass("secondary", "sm")}>
              {t.product.viewCart}
            </Link>
          </div>
        )}
        {feedback?.tone === "error" && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {feedback.text}
          </p>
        )}
      </div>

      {variant?.sku && (
        <p className="mt-1 text-xs text-mist-400">
          {t.product.sku}: <bdi dir="ltr">{variant.sku}</bdi>
        </p>
      )}
    </div>
  )
}

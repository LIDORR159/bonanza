import type { HttpTypes } from "@medusajs/types"
import type { Dictionary } from "./i18n"

/**
 * Reading prices, stock and specifications off a Medusa product. Nothing here
 * calculates a price: it only picks out what Medusa already calculated.
 */

type Variant = HttpTypes.StoreProductVariant

export type VariantPrice = {
  amount: number
  original: number
  onSale: boolean
}

export function variantPrice(variant: Variant | undefined | null): VariantPrice | null {
  const price = variant?.calculated_price
  if (price?.calculated_amount == null) {
    return null
  }
  const amount = Number(price.calculated_amount)
  const original = Number(price.original_amount ?? amount)
  return { amount, original, onSale: original > amount }
}

/** The cheapest variant's price, used wherever one price stands for the product. */
export function cheapestPrice(product: HttpTypes.StoreProduct): VariantPrice | null {
  let best: VariantPrice | null = null
  for (const variant of product.variants ?? []) {
    const price = variantPrice(variant)
    if (price && (!best || price.amount < best.amount)) {
      best = price
    }
  }
  return best
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock"

const LOW_STOCK_THRESHOLD = 5

export function stockState(variant: Variant | undefined | null): StockState {
  if (!variant) {
    return "out_of_stock"
  }
  // Not tracked, or sold on backorder: always available.
  if (variant.manage_inventory === false || variant.allow_backorder) {
    return "in_stock"
  }
  const quantity = variant.inventory_quantity ?? 0
  if (quantity <= 0) {
    return "out_of_stock"
  }
  return quantity <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock"
}

/** How many units can be added to the cart at once. */
export function maxPurchasable(variant: Variant | undefined | null): number {
  if (!variant) {
    return 0
  }
  if (variant.manage_inventory === false || variant.allow_backorder) {
    return 10
  }
  return Math.max(0, Math.min(variant.inventory_quantity ?? 0, 10))
}

/**
 * Specifications are metadata entries whose key starts with `spec:`, so staff
 * can edit them in the product's Metadata section of the admin.
 */
export function productSpecs(
  product: HttpTypes.StoreProduct,
  t: Dictionary
): { label: string; value: string }[] {
  const specs = Object.entries(product.metadata ?? {})
    .filter(([key, value]) => key.startsWith("spec:") && value != null && value !== "")
    .map(([key, value]) => ({ label: key.slice(5), value: String(value) }))
  if (product.weight) {
    const grams = Number(product.weight)
    specs.push({
      label: t.product_specs.weight,
      value:
        grams >= 1000
          ? t.product_specs.kilograms(String(grams / 1000))
          : t.product_specs.grams(grams),
    })
  }
  return specs
}

/** Options with more than one value: the ones worth showing a selector for. */
export function selectableOptions(product: HttpTypes.StoreProduct) {
  const used = new Map<string, Set<string>>()
  for (const variant of product.variants ?? []) {
    for (const optionValue of variant.options ?? []) {
      if (!optionValue.option_id) continue
      const values = used.get(optionValue.option_id) ?? new Set<string>()
      values.add(optionValue.value)
      used.set(optionValue.option_id, values)
    }
  }
  return (product.options ?? [])
    .map((option) => ({
      id: option.id,
      title: option.title,
      // Only the values this product's variants actually use, in option order.
      values: (option.values ?? [])
        .map((value) => value.value)
        .filter((value) => used.get(option.id)?.has(value)),
    }))
    .filter((option) => option.values.length > 1)
}

/** The variant matching a full set of chosen option values. */
export function findVariant(
  product: HttpTypes.StoreProduct,
  selection: Record<string, string>
): Variant | undefined {
  const variants = product.variants ?? []
  if (variants.length === 1) {
    return variants[0]
  }
  return variants.find((variant) =>
    (variant.options ?? []).every(
      (optionValue) =>
        !optionValue.option_id ||
        selection[optionValue.option_id] === undefined ||
        selection[optionValue.option_id] === optionValue.value
    )
  )
}

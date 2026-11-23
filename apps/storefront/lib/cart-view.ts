import type { HttpTypes } from "@medusajs/types"
import type { CartLine } from "@/components/cart/cart-line-items"
import type { SummaryTotals } from "@/components/cart/order-summary"

/**
 * Picks the figures the cart, checkout and order pages display out of a Medusa
 * cart or order. Prices are tax-inclusive, so every amount here includes VAT.
 */

type Totalled = {
  original_item_total?: number | null
  item_total?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  tax_total?: number | null
  total?: number | null
  shipping_methods?: unknown[] | null
}

export function summaryTotals(source: Totalled): SummaryTotals {
  const hasShipping = (source.shipping_methods?.length ?? 0) > 0
  return {
    itemsTotal: Number(source.original_item_total ?? source.item_total ?? 0),
    discountTotal: Number(source.discount_total ?? 0),
    shippingTotal: hasShipping ? Number(source.shipping_total ?? 0) : null,
    taxTotal: Number(source.tax_total ?? 0),
    total: Number(source.total ?? 0),
  }
}

type LineItem = HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem

export function toCartLine(item: LineItem): CartLine {
  const variant = item.variant as HttpTypes.StoreProductVariant | undefined
  const unitPrice = Number(item.unit_price ?? 0)
  const compareAt = Number(item.compare_at_unit_price ?? 0)
  const quantity = Number(item.quantity)
  const tracked = variant?.manage_inventory !== false && !variant?.allow_backorder
  return {
    id: item.id,
    title: item.product_title ?? item.title ?? "",
    // A product sold in one version has a variant named after the option's
    // only value; showing it would add nothing.
    variantTitle:
      (item.variant?.options?.length ?? 0) > 0 && item.variant_title !== "סטנדרט"
        ? (item.variant_title ?? null)
        : null,
    handle: item.product_handle ?? item.product?.handle ?? null,
    thumbnail: item.thumbnail ?? item.product?.thumbnail ?? null,
    quantity,
    unitPrice,
    compareAtUnitPrice: compareAt > unitPrice ? compareAt : null,
    lineTotal: Number(item.original_total ?? unitPrice * quantity),
    maxQuantity:
      tracked && variant?.inventory_quantity != null
        ? Math.max(1, Math.min(variant.inventory_quantity, 99))
        : 99,
  }
}

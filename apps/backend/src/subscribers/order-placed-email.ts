import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { storefrontUrl } from "../lib/env"
import { orderPlacedEmail } from "../lib/emails/order-placed"
import { sendEmail } from "../lib/emails/send"

/** Sends the order confirmation email. */
export default async function orderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "shipping_total",
      "discount_total",
      "items.title",
      "items.variant_title",
      "items.quantity",
      "items.total",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.postal_code",
      "shipping_address.phone",
    ],
    filters: { id: data.id },
  })

  if (!order?.email) {
    return
  }

  const number = (value: unknown) => Number(value ?? 0)
  await sendEmail(container, {
    to: order.email,
    template: "order-placed",
    // One confirmation per order, even if the event is delivered twice.
    idempotency_key: `order-placed-${order.id}`,
    email: orderPlacedEmail({
      display_id: String(order.display_id),
      items: (order.items ?? []).map((item: any) => ({
        title: item.title,
        variant_title: item.variant_title,
        quantity: number(item.quantity),
        total: number(item.total),
      })),
      shipping_total: number(order.shipping_total),
      discount_total: number(order.discount_total),
      total: number(order.total),
      shipping_address: order.shipping_address as any,
      order_url: `${storefrontUrl()}/order/${order.id}/confirmed`,
    }),
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

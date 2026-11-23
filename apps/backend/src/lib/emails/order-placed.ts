import { button, escapeHtml, formatIls, layout } from "./layout"

type OrderEmailInput = {
  display_id: number | string
  items: { title: string; variant_title?: string | null; quantity: number; total: number }[]
  shipping_total: number
  discount_total: number
  total: number
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    city?: string | null
    postal_code?: string | null
    phone?: string | null
  } | null
  order_url: string
}

export function orderPlacedEmail(order: OrderEmailInput) {
  const subject = `ההזמנה שלך התקבלה (מספר ${order.display_id})`

  const rows = order.items
    .map(
      (item) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #ececea">${escapeHtml(item.title)}${
        item.variant_title
          ? `<br><span style="color:#77797c;font-size:14px">${escapeHtml(item.variant_title)}</span>`
          : ""
      }</td>
<td style="padding:10px 8px;border-bottom:1px solid #ececea;text-align:center;white-space:nowrap">×${escapeHtml(item.quantity)}</td>
<td style="padding:10px 0;border-bottom:1px solid #ececea;text-align:left;white-space:nowrap"><span dir="ltr">${escapeHtml(formatIls(item.total))}</span></td>
</tr>`
    )
    .join("")

  const totalRow = (label: string, amount: number, bold = false) =>
    `<tr><td colspan="2" style="padding:6px 0;${bold ? "font-weight:800;font-size:17px" : "color:#55575a"}">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:left;white-space:nowrap;${bold ? "font-weight:800;font-size:17px" : ""}"><span dir="ltr">${escapeHtml(formatIls(amount))}</span></td></tr>`

  const address = order.shipping_address
  const addressHtml = address
    ? `<h2 style="font-size:16px;margin:26px 0 6px">כתובת למשלוח</h2>
<p style="margin:0">${escapeHtml([address.first_name, address.last_name].filter(Boolean).join(" "))}<br>
${escapeHtml(address.address_1)}<br>
${escapeHtml([address.city, address.postal_code].filter(Boolean).join(" "))}${
        address.phone ? `<br><span dir="ltr">${escapeHtml(address.phone)}</span>` : ""
      }</p>`
    : ""

  const html = layout(
    "תודה, ההזמנה התקבלה",
    `<p>מספר ההזמנה שלך: <strong dir="ltr">${escapeHtml(order.display_id)}</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${rows}
${order.discount_total > 0 ? totalRow("הנחה", -order.discount_total) : ""}
${totalRow("משלוח", order.shipping_total)}
${totalRow("סה״כ לתשלום (כולל מע״מ)", order.total, true)}</table>
${addressHtml}
${button("צפייה בהזמנה", order.order_url)}`
  )

  const text = `תודה, ההזמנה התקבלה.
מספר הזמנה: ${order.display_id}

${order.items.map((item) => `${item.title} ×${item.quantity} — ${formatIls(item.total)}`).join("\n")}

משלוח: ${formatIls(order.shipping_total)}
סה״כ לתשלום (כולל מע״מ): ${formatIls(order.total)}

צפייה בהזמנה: ${order.order_url}`

  return { subject, html, text }
}

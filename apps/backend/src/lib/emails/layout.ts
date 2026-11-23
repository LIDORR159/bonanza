/**
 * Shared shell for transactional emails: Hebrew, right-to-left, plain enough
 * to render in every mail client. Styles are inline because many clients drop
 * <style> blocks.
 */

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  )

const numberFormatter = new Intl.NumberFormat("he-IL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** `₪1,234.5`: the same form the storefront shows. Render inside dir="ltr". */
export const formatIls = (amount: number): string =>
  `${amount < 0 ? "-" : ""}₪${numberFormatter.format(Math.abs(amount))}`

export function button(label: string, url: string): string {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#111213;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:6px">${escapeHtml(label)}</a></p>`
}

export function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f0;font-family:Arial,Helvetica,sans-serif;color:#1b1c1d;direction:rtl;text-align:right">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#111213;color:#ffffff;padding:22px 28px;font-size:22px;font-weight:800;letter-spacing:2px;text-align:center" dir="ltr">BONANZA</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.7">
<h1 style="font-size:21px;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:18px 28px;background:#fafaf8;color:#77797c;font-size:13px;line-height:1.6">הודעה זו נשלחה אוטומטית מאתר BONANZA.</td></tr>
</table></td></tr></table>
</body></html>`
}

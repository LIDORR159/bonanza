import { button, escapeHtml, layout } from "./layout"

export function passwordResetEmail(resetUrl: string) {
  const subject = "איפוס סיסמה ל-BONANZA"
  const html = layout(
    "איפוס סיסמה",
    `<p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך.</p>
${button("בחירת סיסמה חדשה", resetUrl)}
<p>הקישור תקף לזמן מוגבל. אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מההודעה הזו והסיסמה לא תשתנה.</p>
<p style="font-size:13px;color:#77797c">אם הכפתור לא נפתח, אפשר להעתיק את הכתובת הבאה לדפדפן:<br><span dir="ltr" style="word-break:break-all">${escapeHtml(resetUrl)}</span></p>`
  )
  const text = `קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך ב-BONANZA.

לבחירת סיסמה חדשה:
${resetUrl}

אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מההודעה הזו.`
  return { subject, html, text }
}

const numberFormatter = new Intl.NumberFormat("he-IL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * `₪1,234.5`, and `₪649` for whole amounts: the shekel sign directly before
 * the number, the form most Israeli stores use.
 *
 * The string is built here instead of taken from `Intl`'s currency style,
 * because that output carries direction marks and puts the sign after the
 * number. Callers render it inside `<bdi dir="ltr">` so the sign and digits
 * keep this order within Hebrew text.
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return ""
  }
  const sign = amount < 0 ? "-" : ""
  return `${sign}₪${numberFormatter.format(Math.abs(amount))}`
}

/** `intl` is the language's `Intl` code, from `LOCALE_SETTINGS`. */
export function formatDate(
  value: string | Date | null | undefined,
  intl = "he-IL"
): string {
  if (!value) {
    return ""
  }
  return new Intl.DateTimeFormat(intl, { dateStyle: "long" }).format(new Date(value))
}

/** Percentage saved, rounded: 549 → 469 is 15. */
export function discountPercent(original: number, current: number): number {
  if (!original || current >= original) {
    return 0
  }
  return Math.round(((original - current) / original) * 100)
}

// ── Israeli phone numbers ───────────────────────────────────────────────────

/**
 * Accepts the ways people type an Israeli number (050-1234567, 0501234567,
 * +972 50 123 4567, 03-1234567) and returns it in international form,
 * `+972501234567`. Returns null when it is not a valid Israeli number.
 */
export function normalizeIsraeliPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "")
  let national: string
  if (/^\+?972\d+$/.test(digits)) {
    national = digits.replace(/^\+?972/, "").replace(/^0/, "")
  } else if (/^0\d+$/.test(digits)) {
    national = digits.slice(1)
  } else {
    return null
  }
  // Mobile and VoIP: 5X/7X + 7 digits. Landline: 2, 3, 4, 8 or 9 + 7 digits.
  const valid = /^(5\d|7[2-9])\d{7}$/.test(national) || /^[23489]\d{7}$/.test(national)
  return valid ? `+972${national}` : null
}

/** `+972501234567` → `050-1234567`, for display. */
export function formatIsraeliPhone(value: string | null | undefined): string {
  if (!value) {
    return ""
  }
  const normalized = normalizeIsraeliPhone(value)
  if (!normalized) {
    return value
  }
  const national = `0${normalized.slice(4)}`
  const split = national.length === 10 ? 3 : 2
  return `${national.slice(0, split)}-${national.slice(split)}`
}

/** Israeli postal codes are seven digits. */
export const isIsraeliPostalCode = (value: string): boolean =>
  /^\d{7}$/.test(value.trim())

export const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

import { describe, expect, it } from "vitest"
import {
  discountPercent,
  formatDate,
  formatIsraeliPhone,
  formatPrice,
  isEmail,
  isIsraeliPostalCode,
  normalizeIsraeliPhone,
} from "./format"

describe("formatPrice", () => {
  it("puts the shekel sign before the number and drops empty decimals", () => {
    expect(formatPrice(649)).toBe("₪649")
    expect(formatPrice(1234.5)).toBe("₪1,234.5")
    expect(formatPrice(0)).toBe("₪0")
  })

  it("keeps the minus sign outside the currency sign", () => {
    expect(formatPrice(-35)).toBe("-₪35")
  })

  it("returns nothing for a missing amount", () => {
    expect(formatPrice(null)).toBe("")
    expect(formatPrice(undefined)).toBe("")
    expect(formatPrice(Number.NaN)).toBe("")
  })
})

describe("Israeli phone numbers", () => {
  it("accepts the ways people type a mobile number", () => {
    for (const input of [
      "050-1234567",
      "0501234567",
      "+972 50 123 4567",
      "972501234567",
    ]) {
      expect(normalizeIsraeliPhone(input)).toBe("+972501234567")
    }
  })

  it("accepts landlines and rejects everything else", () => {
    expect(normalizeIsraeliPhone("03-1234567")).toBe("+97231234567")
    expect(normalizeIsraeliPhone("050-123")).toBeNull()
    expect(normalizeIsraeliPhone("+1 415 555 0100")).toBeNull()
    expect(normalizeIsraeliPhone("hello")).toBeNull()
  })

  it("formats for display and leaves unknown input alone", () => {
    expect(formatIsraeliPhone("+972501234567")).toBe("050-1234567")
    expect(formatIsraeliPhone("+97231234567")).toBe("03-1234567")
    expect(formatIsraeliPhone("not a number")).toBe("not a number")
    expect(formatIsraeliPhone(null)).toBe("")
  })
})

describe("small validators", () => {
  it("checks postal codes and emails", () => {
    expect(isIsraeliPostalCode("6100000")).toBe(true)
    expect(isIsraeliPostalCode("61000")).toBe(false)
    expect(isEmail("dana@example.com")).toBe(true)
    expect(isEmail("dana@example")).toBe(false)
  })

  it("rounds the saved percentage and never goes negative", () => {
    expect(discountPercent(549, 469)).toBe(15)
    expect(discountPercent(100, 100)).toBe(0)
    expect(discountPercent(100, 120)).toBe(0)
    expect(discountPercent(0, 10)).toBe(0)
  })
})

describe("formatDate", () => {
  it("follows the language it is given", () => {
    const date = "2026-11-23T10:00:00Z"
    expect(formatDate(date, "en-IL")).toMatch(/November/)
    expect(formatDate(date, "he-IL")).toMatch(/נובמבר/)
    expect(formatDate(null)).toBe("")
  })
})

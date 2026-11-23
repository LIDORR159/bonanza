import { describe, expect, it } from "vitest"
import { LOCALES } from "../config"
import { alternatePaths, getDictionary, localePath, splitLocale } from "./index"

describe("localePath", () => {
  it("leaves Hebrew paths without a prefix", () => {
    expect(localePath("he", "/products")).toBe("/products")
    expect(localePath("he", "/")).toBe("/")
  })

  it("prefixes English and Arabic", () => {
    expect(localePath("en", "/products?q=1")).toBe("/en/products?q=1")
    expect(localePath("ar", "/")).toBe("/ar")
    expect(localePath("en", "/#pricing")).toBe("/en#pricing")
  })

  it("replaces a prefix that is already there", () => {
    expect(localePath("ar", "/en/cart")).toBe("/ar/cart")
    expect(localePath("he", "/en/cart")).toBe("/en/cart")
  })

  it("does not touch addresses that leave the site", () => {
    for (const external of [
      "https://example.com/x",
      "//example.com",
      "tel:+972501234567",
      "#main",
    ]) {
      expect(localePath("en", external)).toBe(external)
    }
  })
})

describe("splitLocale", () => {
  it("separates the language from the rest of the path", () => {
    expect(splitLocale("/en/products")).toEqual({ locale: "en", rest: "/products" })
    expect(splitLocale("/ar")).toEqual({ locale: "ar", rest: "/" })
    expect(splitLocale("/products")).toEqual({ locale: "he", rest: "/products" })
  })

  it("is not fooled by a path that merely starts with the same letters", () => {
    expect(splitLocale("/english-course")).toEqual({
      locale: "he",
      rest: "/english-course",
    })
    expect(splitLocale("/art")).toEqual({ locale: "he", rest: "/art" })
  })
})

describe("alternatePaths", () => {
  it("lists the same page in every language", () => {
    expect(alternatePaths("/gallery")).toEqual({
      he: "/gallery",
      en: "/en/gallery",
      ar: "/ar/gallery",
    })
  })
})

/** Every key path in a dictionary, with whether it is text or a function. */
const shape = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, child]) => shape(child, `${prefix}${key}.`))
    : [`${prefix.slice(0, -1)}:${typeof value}`]

describe("dictionaries", () => {
  it("have the same keys, of the same kind, in every language", () => {
    const hebrew = shape(getDictionary("he")).sort()
    for (const locale of LOCALES) {
      expect(shape(getDictionary(locale)).sort(), locale).toEqual(hebrew)
    }
  })

  it("are actually translated", () => {
    expect(getDictionary("en").cart.title).not.toBe(getDictionary("he").cart.title)
    expect(getDictionary("ar").cart.title).toMatch(/[؀-ۿ]/)
  })
})

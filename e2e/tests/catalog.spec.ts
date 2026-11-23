import { expect, test, type Page } from "@playwright/test"

/** Category navigation, filters, sorting, search and pagination. */

const cardTitles = (page: Page) => page.getByRole("article").getByRole("heading").allTextContents()

const cardPrices = async (page: Page) =>
  (await page.getByRole("article").locator("span.font-bold > bdi").allTextContents()).map((text) =>
    Number(text.replace(/[₪,]/g, ""))
  )

test("a category shows only its products", async ({ page }) => {
  await page.goto("/categories/trimmers")
  await expect(page.getByText("4 מוצרים")).toBeVisible()
  for (const title of await cardTitles(page)) {
    expect(title).toContain("טרימר")
  }
})

test("the catalog paginates", async ({ page }) => {
  await page.goto("/products")
  await expect(page.getByText("37 מוצרים")).toBeVisible()
  await expect(page.getByRole("article")).toHaveCount(12)
  const first = await cardTitles(page)

  await page.getByRole("navigation", { name: "מעבר בין עמודים" }).getByRole("link", { name: "עמוד 2" }).click()
  await expect(page).toHaveURL(/page=2/)
  const second = await cardTitles(page)
  expect(second).toHaveLength(12)
  expect(second.filter((title) => first.includes(title))).toEqual([])

  await page.goto("/products?page=4")
  await expect(page.getByRole("article")).toHaveCount(1)
})

test("sorting by price orders the products", async ({ page }) => {
  await page.goto("/products?sort=price-asc")
  const ascending = await cardPrices(page)
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

  await page.goto("/products?sort=price-desc")
  const descending = await cardPrices(page)
  expect(descending).toEqual([...descending].sort((a, b) => b - a))
  expect(descending[0]).toBe(5690)
})

test("the filter form narrows by brand and price", async ({ page, isMobile }) => {
  await page.goto("/products")
  if (isMobile) {
    await page.getByText("סינון ומיון").click()
  }
  const filters = isMobile ? page.locator("details") : page.getByRole("complementary", { name: "סינון" })
  await filters.getByLabel("Barbera").check()
  await filters.getByLabel("ממחיר").fill("60")
  await filters.getByLabel("עד מחיר").fill("70")
  await filters.getByRole("button", { name: "החלת הסינון" }).click()

  await expect(page).toHaveURL(/brand=barbera/)
  await expect(page).toHaveURL(/min=60/)
  const prices = await cardPrices(page)
  expect(prices.length).toBeGreaterThan(0)
  for (const price of prices) {
    expect(price).toBeGreaterThanOrEqual(60)
    expect(price).toBeLessThanOrEqual(70)
  }
  for (const brand of await page.getByRole("article").locator("p bdi").allTextContents()) {
    expect(brand).toBe("Barbera")
  }

  await page.getByRole("link", { name: "ניקוי הסינון" }).first().click()
  await expect(page.getByText("37 מוצרים")).toBeVisible()
})

test("the sale filter shows only reduced products, with both prices", async ({ page }) => {
  await page.goto("/products?sale=1")
  await expect(page.getByRole("heading", { name: "מבצעים", level: 1 })).toBeVisible()
  const cards = page.getByRole("article")
  await expect(cards).toHaveCount(6)
  for (const card of await cards.all()) {
    await expect(card.getByText(/^מבצע -\d+%$/)).toBeVisible()
    await expect(card.locator(".line-through")).toBeVisible()
  }
})

test("search finds Hebrew words, including ones with a prefix attached", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "חיפוש" }).click()
  await page.getByRole("searchbox", { name: "חיפוש" }).fill("זקן")
  await page.getByRole("searchbox", { name: "חיפוש" }).press("Enter")

  await expect(page).toHaveURL(/q=/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("תוצאות חיפוש")
  // "שמן לזקן" only contains the word with the prefix "ל" attached.
  expect(await cardTitles(page)).toContain("שמן לזקן Olivo")
})

test("search with no match says so", async ({ page }) => {
  await page.goto("/products?q=xyzzy-nothing")
  await expect(page.getByText("לא נמצאו מוצרים מתאימים.")).toBeVisible()
})

test("a brand page lists that brand's products", async ({ page }) => {
  await page.goto("/brands")
  await page.getByRole("link", { name: "Maestro" }).click()
  await expect(page).toHaveURL(/\/brands\/maestro/)
  await expect(page.getByRole("heading", { name: "Maestro", level: 1 })).toBeVisible()
  await expect(page.getByRole("article")).toHaveCount(3)
})

test("the product page shows variants, stock, specifications and related products", async ({ page }) => {
  await page.goto("/products/maestro-cutting-scissors")
  await expect(page.getByRole("heading", { name: "מספרי תספורת Maestro", level: 1 })).toBeVisible()
  await expect(page.getByText("המחיר כולל מע״מ")).toBeVisible()

  // Three lengths, each with its own price; the 6.5" one is out of stock.
  await page.getByRole("radio", { name: '5.5"' }).check({ force: true })
  await expect(page.getByText("₪329").first()).toBeVisible()
  await expect(page.getByText(/מק״ט/)).toContainText("BNZ-SCS-001-55")

  await page.getByRole("radio", { name: '6.5"' }).check({ force: true })
  await expect(page.getByText("₪369").first()).toBeVisible()
  await expect(page.getByText("אזל מהמלאי").first()).toBeVisible()
  await expect(page.getByRole("button", { name: "אזל מהמלאי" })).toBeDisabled()

  await expect(page.getByRole("heading", { name: "מפרט" })).toBeVisible()
  await expect(page.getByText("58–60 HRC")).toBeVisible()
  await expect(page.getByRole("heading", { name: "מוצרים נוספים שיעניינו אותך" })).toBeVisible()

  // Structured data for search engines, with the VAT-inclusive price.
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
  const product = jsonLd.map((text) => JSON.parse(text)).find((data) => data["@type"] === "Product")
  expect(product.offers.priceCurrency).toBe("ILS")
  expect(product.offers.price).toBe("329.00")
  expect(product.brand.name).toBe("Maestro")
})

test("low stock is announced", async ({ page }) => {
  await page.goto("/products/kiro-pro-mini-trimmer")
  await expect(page.getByText("נותרו 3 יחידות אחרונות")).toBeVisible()
})

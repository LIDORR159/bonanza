import { expect, test } from "@playwright/test"

/**
 * Layout, language and direction. Runs on desktop and on a phone viewport.
 */

const PAGES = [
  "/",
  "/products",
  "/categories/clippers",
  "/products/stahlwerk-x1-cordless-clipper",
  "/brands",
  "/about",
  "/cart",
  "/account/login",
]

test("the page is Hebrew and right-to-left", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("html")).toHaveAttribute("lang", "he")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

  // Right-to-left for real: the logo sits at the right edge of the header and
  // the cart at the left.
  const viewport = page.viewportSize()!
  const logo = await page.getByRole("banner").getByRole("link", { name: /BONANZA/ }).boundingBox()
  const cart = await page.getByRole("link", { name: /סל הקניות/ }).boundingBox()
  expect(logo!.x + logo!.width / 2).toBeGreaterThan(viewport.width / 2)
  expect(cart!.x + cart!.width / 2).toBeLessThan(viewport.width / 2)
})

test("the logo is the supplied file, undistorted", async ({ page }) => {
  await page.goto("/")
  const logo = page.getByRole("banner").getByRole("img", { name: /BONANZA BARBERSHOP & ACADEMY/ })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute("src", /bonanza-lockup/)
  const box = (await logo.boundingBox())!
  // The lockup's own proportions, 1822:735.
  expect(box.width / box.height).toBeCloseTo(1822 / 735, 1)
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
})

for (const path of PAGES) {
  test(`no sideways scrolling and no broken images on ${path}`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)

    // Content wider than the screen is the usual sign of a layout that was
    // only checked in one direction or at one width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo({ top: y, behavior: "instant" })
        await new Promise((resolve) => setTimeout(resolve, 60))
      }
    })
    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
    )
    expect(broken).toEqual([])
    expect(errors).toEqual([])
  })
}

test("prices show the shekel sign before the number", async ({ page }) => {
  await page.goto("/products")
  const price = page.getByRole("article").first().locator("bdi[dir=ltr]").first()
  await expect(price).toHaveText(/^₪[\d,]+(\.\d{1,2})?$/)
})

test("the home page comes from the admin's sections, in order", async ({ page }) => {
  await page.goto("/")
  const headings = await page.getByRole("heading", { level: 2 }).allTextContents()
  expect(headings).toEqual(expect.arrayContaining(["קטגוריות", "הנמכרים ביותר", "המותגים שלנו"]))
  expect(headings.indexOf("קטגוריות")).toBeLessThan(headings.indexOf("המותגים שלנו"))
  // The row of cards overlapping the hero.
  await expect(page.getByRole("article").first()).toBeVisible()
})

test("navigation reaches a category", async ({ page, isMobile }) => {
  await page.goto("/")
  if (isMobile) {
    await page.getByRole("button", { name: "פתיחת התפריט" }).click()
    await page.getByRole("dialog").getByRole("link", { name: "טרימרים" }).click()
  } else {
    const nav = page.getByRole("navigation", { name: "ניווט ראשי" })
    await nav.getByRole("button", { name: "כל המוצרים" }).click()
    await nav.getByRole("link", { name: "טרימרים" }).click()
  }
  await expect(page).toHaveURL(/\/categories\/trimmers/)
  await expect(page.getByRole("heading", { name: "טרימרים", level: 1 })).toBeVisible()
})

test("keyboard users can skip to the content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard navigation is a desktop check")
  await page.goto("/")
  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "דילוג לתוכן הראשי" })
  await expect(skip).toBeFocused()
  await skip.press("Enter")
  await expect(page).toHaveURL(/#main$/)
})

test("an unknown address shows the Hebrew not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page-here")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "העמוד לא נמצא" })).toBeVisible()
})

test("temporary URLs are kept out of search engines", async ({ page, request }) => {
  await page.goto("/")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /")
})

test("personal pages are never cacheable", async ({ request }) => {
  for (const path of ["/cart", "/checkout", "/account/login", "/api/cart"]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.headers()["cache-control"], path).toMatch(/no-store/)
  }
})

import { expect, test } from "@playwright/test"
import {
  addToCart,
  adminApi,
  checkoutToPaymentPage,
  fillCheckoutDetails,
  uniqueEmail,
  waitForEmail,
} from "./helpers"

const PRODUCT = "barbera-matte-clay" // ₪69, single version, plenty of stock
const VARIANT_PRODUCT = "stahlwerk-x1-cordless-clipper" // two finishes

test.describe("cart", () => {
  test("add, change quantity, apply a code, remove", async ({ page }) => {
    await addToCart(page, PRODUCT)
    await expect(page.getByRole("link", { name: /סל הקניות, 1 פריטים/ })).toBeVisible()

    await page.goto("/cart")
    await expect(page.getByRole("heading", { name: "סל הקניות", level: 1 })).toBeVisible()
    const summary = page.getByRole("region", { name: "סיכום הזמנה" })
    await expect(summary).toContainText("₪69")

    // Quantity 1 → 2: the total doubles, and it is Medusa that says so.
    await page.getByRole("button", { name: "הוספת כמות" }).click()
    await expect(summary).toContainText("₪138")

    // A real code takes 10% off; a made-up one is refused.
    await page.getByLabel("קוד קופון").fill("NOT-A-CODE")
    await page.getByRole("button", { name: "החלה" }).click()
    await expect(page.getByText("הקופון אינו תקף.")).toBeVisible()

    await page.getByLabel("קוד קופון").fill("bonanza10")
    await page.getByRole("button", { name: "החלה" }).click()
    await expect(summary).toContainText("הנחה")
    await expect(summary).toContainText("₪124.2")

    await page.getByRole("button", { name: /^הסרת .* מהסל$/ }).click()
    await expect(page.getByText("הסל שלך ריק.")).toBeVisible()
  })

  test("the cart survives a reload", async ({ page }) => {
    await addToCart(page, PRODUCT)
    await page.goto("/cart")
    await page.reload()
    await expect(page.getByRole("region", { name: "סיכום הזמנה" })).toContainText("₪69")
  })
})

test.describe("checkout", () => {
  test("address validation rejects a bad phone number and postal code", async ({
    page,
  }) => {
    await addToCart(page, PRODUCT)
    await page.goto("/checkout")
    await page.getByLabel("אימייל").fill("not-an-email")
    await page.getByLabel("שם פרטי").fill("דנה")
    await page.getByLabel("שם משפחה").fill("כהן")
    await page.getByLabel("טלפון נייד").fill("12345")
    await page.getByLabel("רחוב ומספר בית").fill("הרצל 10")
    await page.getByLabel("עיר").fill("תל אביב")
    await page.getByLabel("מיקוד").fill("123")
    await page.getByRole("button", { name: "המשך לבחירת משלוח" }).click()

    await expect(page.getByText("יש להזין כתובת אימייל תקינה.")).toBeVisible()
    await expect(page.getByText("יש להזין מספר טלפון ישראלי תקין.")).toBeVisible()
    await expect(page.getByText("מיקוד בישראל הוא בן 7 ספרות.")).toBeVisible()
    // Still on the first step.
    await expect(page.getByRole("button", { name: "המשך לבחירת משלוח" })).toBeVisible()
  })

  test("a guest buys a product: approved payment creates a paid order", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("guest")

    // Choose the gold finish, which has its own price.
    await page.goto(`/products/${VARIANT_PRODUCT}`)
    await page.getByRole("radio", { name: "זהב" }).check({ force: true })
    await expect(page.getByText("₪679").first()).toBeVisible()
    await page.getByRole("button", { name: "הוספה לסל" }).click()
    await expect(page.getByText("המוצר נוסף לסל")).toBeVisible()

    await page.goto("/checkout")
    await fillCheckoutDetails(page, email)

    // ₪679 is above the free-shipping threshold, so standard delivery is free
    // and express is not.
    const shippingOptions = page.getByRole("group", { name: "שיטת משלוח" })
    await expect(shippingOptions.getByText("משלוח עד הבית")).toBeVisible()
    await shippingOptions.getByText("משלוח אקספרס").click()
    await page.getByRole("button", { name: "המשך לתשלום" }).click()

    const review = page.getByRole("region", { name: "פרטי ההזמנה" })
    await expect(review).toContainText("₪60") // express shipping
    await expect(review).toContainText("₪739") // 679 + 60

    await page.getByRole("button", { name: "מעבר לתשלום מאובטח" }).click()
    await page.waitForURL(/\/dev-gateway\/pay\//)
    // The amount on the payment page is the one Medusa calculated.
    await expect(page.locator(".amount")).toContainText("739")
    await page.getByRole("button", { name: "אישור תשלום" }).click()

    await page.waitForURL(/\/order\/order_[^/]+\/confirmed/, { timeout: 60_000 })
    await expect(page.getByRole("heading", { name: "תודה, ההזמנה התקבלה" })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByRole("region", { name: "סיכום" })).toContainText("₪739")

    // The order exists in Medusa, with the right total and a captured payment.
    const orderId = page.url().match(/order\/(order_[^/]+)\//)![1]
    const response = await adminApi(
      request,
      "get",
      `/admin/orders/${orderId}?fields=id,email,total,payment_status,*items`
    )
    const { order } = await response.json()
    expect(order.email).toBe(email)
    expect(order.total).toBe(739)
    expect(order.payment_status).toBe("captured")
    expect(order.items[0].variant_sku).toBe("BNZ-CLP-001-GLD")

    // The cart is gone and the badge is back to empty.
    await page.goto("/cart")
    await expect(page.getByText("הסל שלך ריק.")).toBeVisible()

    // The confirmation email arrived, in Hebrew, with the order total.
    const html = await waitForEmail(request, email, "ההזמנה שלך התקבלה")
    expect(html).toContain("₪739")
  })

  test("a declined payment creates no order and keeps the cart", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("declined")
    await addToCart(page, PRODUCT)
    await checkoutToPaymentPage(page, email)
    await page.getByRole("button", { name: "דחיית הכרטיס" }).click()

    await page.waitForURL(/\/checkout\/return/)
    await expect(page.getByRole("heading", { name: "התשלום לא אושר" })).toBeVisible()

    await page.goto("/cart")
    await expect(page.getByRole("region", { name: "סיכום הזמנה" })).toContainText("₪69")

    const response = await adminApi(
      request,
      "get",
      `/admin/orders?q=${encodeURIComponent(email)}`
    )
    expect((await response.json()).orders).toHaveLength(0)
  })

  test("a canceled payment creates no order and keeps the cart", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("canceled")
    await addToCart(page, PRODUCT)
    await checkoutToPaymentPage(page, email)
    await page.getByRole("button", { name: "ביטול וחזרה לחנות" }).click()

    await page.waitForURL(/\/checkout\/return/)
    await expect(page.getByRole("heading", { name: "התשלום בוטל" })).toBeVisible()

    const response = await adminApi(
      request,
      "get",
      `/admin/orders?q=${encodeURIComponent(email)}`
    )
    expect((await response.json()).orders).toHaveLength(0)
  })

  test("returning with a forged success address does not create an order", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("forged")
    await addToCart(page, PRODUCT)
    await checkoutToPaymentPage(page, email)

    // Skip the payment page and go straight to the "success" address.
    await page.goto("/checkout/return?outcome=approved&charge=dgch_made_up")
    await expect(
      page.getByRole("heading", { name: "עדיין לא קיבלנו אישור תשלום" })
    ).toBeVisible({
      timeout: 40_000,
    })

    const response = await adminApi(
      request,
      "get",
      `/admin/orders?q=${encodeURIComponent(email)}`
    )
    expect((await response.json()).orders).toHaveLength(0)
  })
})
